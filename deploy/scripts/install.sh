#!/usr/bin/env bash
# First-time production install on a fresh Ubuntu 24.04 / Debian 12 server.
# Run from a clone of the repo (ideally /opt/ourdealshub):
#
#   deploy/scripts/install.sh
#
# It installs Docker if needed, writes .env (asking for the domain and admin
# email, generating every secret), builds and starts the stack, creates the
# Super Admin, installs the cron + backup timers and the `ourdeals` command.
# Safe to re-run: an existing .env is kept and the admin is not re-seeded.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

[[ $EUID -eq 0 ]] && die "Run as your normal user (it uses sudo when needed), not root."
command -v git >/dev/null || { say "Installing git"; sudo apt-get update -qq && sudo apt-get install -y -qq git; }

# --- Docker ----------------------------------------------------------------
if ! command -v docker >/dev/null; then
  say "Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  DOCKER=(sudo docker)   # group membership applies from your next login
fi
"${DOCKER[@]}" compose version >/dev/null || die "Docker Compose plugin is missing."

# --- .env --------------------------------------------------------------------
set_env() { # KEY VALUE: replace the KEY= line, or append it
  local key="$1" val="$2"
  if grep -q "^$key=" .env; then
    awk -v k="$key" -v v="$val" 'BEGIN{FS=OFS="="} $1==k {print k "=\"" v "\""; next} {print}' .env > .env.tmp
    mv .env.tmp .env
  else
    printf '%s="%s"\n' "$key" "$val" >> .env
  fi
}

FRESH_ENV=0
ADMIN_PASSWORD=""
if [[ -f .env ]]; then
  say "Keeping existing .env"
else
  FRESH_ENV=1
  echo
  read -rp "Domain for the site (e.g. ourdealshub.com, or ourdeals.lan for a LAN test): " DOMAIN
  [[ -n "$DOMAIN" ]] || die "A domain is required."
  read -rp "Super Admin email [admin@$DOMAIN]: " ADMIN_EMAIL
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@$DOMAIN}"
  echo "HTTPS certificate:"
  echo "  1) Let's Encrypt (public domain whose DNS points at this server, ports 80/443 open)"
  echo "  2) Internal/self-signed (LAN only; browsers warn until you trust the cert)"
  read -rp "Choose 1 or 2 [1]: " TLS_CHOICE
  if [[ "${TLS_CHOICE:-1}" == "2" ]]; then
    CADDY_TLS="internal"
  else
    read -rp "Email for Let's Encrypt expiry notices [$ADMIN_EMAIL]: " LE_EMAIL
    CADDY_TLS="${LE_EMAIL:-$ADMIN_EMAIL}"
  fi

  umask 077
  cp .env.example .env
  chmod 600 .env
  AUTH=$(openssl rand -hex 32)
  ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)
  set_env SITE_DOMAIN "$DOMAIN"
  set_env NEXT_PUBLIC_SITE_URL "https://$DOMAIN"
  set_env AUTH_URL "https://$DOMAIN"
  set_env NEXTAUTH_URL "https://$DOMAIN"
  set_env AUTH_SECRET "$AUTH"
  set_env NEXTAUTH_SECRET "$AUTH"
  set_env CRON_SECRET "$(openssl rand -hex 32)"
  set_env POSTGRES_PASSWORD "$(openssl rand -hex 24)"
  set_env ADMIN_EMAIL "$ADMIN_EMAIL"
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  set_env CONTACT_EMAIL "hello@$DOMAIN"
  set_env CADDY_TLS "$CADDY_TLS"
  umask 022
  say ".env written (secrets generated, file is private to you)"
fi

for key in SITE_DOMAIN NEXT_PUBLIC_SITE_URL AUTH_SECRET CRON_SECRET POSTGRES_PASSWORD; do
  [[ -n "$(env_get "$key")" ]] || die "$key is empty in .env. Fill it in (see docs/DEPLOY.md) and re-run."
done

# --- Build + start -----------------------------------------------------------
say "Building and starting (the first build takes a few minutes)"
compose up -d --build --remove-orphans
say "Waiting for the app to answer"
wait_for_app 180 || { compose logs --tail=60 app migrate; die "The app didn't start. See the logs above."; }

if [[ $FRESH_ENV -eq 1 ]]; then
  say "Creating the Super Admin and starter categories"
  compose run --rm -e ALLOW_PROD_SEED=1 -e SEED_WIPE=0 migrate npm run db:seed </dev/null
fi

# --- Timers + command ----------------------------------------------------------
say "Installing daily cron (13:00 UTC) and nightly backup (03:30) timers"
for unit in deploy/systemd/ourdealshub-*.{service,timer}; do
  sed "s#/opt/ourdealshub#$ROOT#g" "$unit" | sudo tee "/etc/systemd/system/$(basename "$unit")" >/dev/null
done
sudo install -d -m 700 -o "$USER" -g "$(id -gn)" "$BACKUP_DIR"
sudo systemctl daemon-reload
sudo systemctl enable --now ourdealshub-cron.timer ourdealshub-backup.timer >/dev/null
sudo ln -sf "$ROOT/deploy/ourdeals" /usr/local/bin/ourdeals

DOMAIN="$(env_get SITE_DOMAIN)"
echo
say "OurDealsHub is running at https://$DOMAIN"
if [[ -n "$ADMIN_PASSWORD" ]]; then
  echo "    Admin:    https://$DOMAIN/admin"
  echo "    Email:    $(env_get ADMIN_EMAIL)"
  echo "    Password: $ADMIN_PASSWORD"
  echo "    (Saved in $ROOT/.env. Change it after your first sign-in.)"
fi
if [[ "$(env_get CADDY_TLS)" == "internal" ]]; then
  echo
  echo "    LAN setup: point $DOMAIN at this server's IP (hosts file or router DNS),"
  echo "    then trust the certificate: ourdeals cert  (writes caddy-root.crt)"
fi
echo
echo "    Next: Admin → Settings → API Keys (Gemini, Amazon), then Admins → your tracking ID."
echo "    Update later with:  ourdeals update      Status: ourdeals status"

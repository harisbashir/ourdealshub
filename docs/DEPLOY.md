# Self-hosted deployment (Docker)

Runs the whole stack on one Linux host (e.g. a Proxmox VM):

| Service   | What it does                                                      |
|-----------|-------------------------------------------------------------------|
| `db`      | Postgres 16, data in the `pgdata` volume, not exposed to the host  |
| `migrate` | Runs `prisma migrate deploy` on every start, then exits            |
| `app`     | Next.js standalone server (Node 22, non-root) on port 3000 (internal) |
| `caddy`   | HTTPS on 80/443, reverse-proxies to `app`, sets `X-Real-IP`         |

Host-side systemd timers call the daily cron endpoint and take nightly backups.

## 1. Host prerequisites

Debian 12 / Ubuntu 24.04, 2 vCPU, 2–4 GB RAM, ~15 GB disk.

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # log out/in afterwards
sudo apt-get install -y git
```

## 2. Get the code

```bash
sudo mkdir -p /opt/ourdealshub && sudo chown "$USER" /opt/ourdealshub
git clone https://github.com/harisbashir/ourdealshub.git /opt/ourdealshub
cd /opt/ourdealshub
```

The systemd units assume `/opt/ourdealshub`; edit them if you use another path.

## 3. Configure `.env`

```bash
cp .env.example .env
```

Set at least:

| Variable | Value |
|----------|-------|
| `SITE_DOMAIN` | e.g. `ourdeals.lan` |
| `NEXT_PUBLIC_SITE_URL`, `AUTH_URL`, `NEXTAUTH_URL` | `https://<SITE_DOMAIN>` (must be https and not localhost, or the app refuses to boot) |
| `AUTH_SECRET`, `NEXTAUTH_SECRET` | same value, `openssl rand -base64 48` |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Super Admin login (strong password) |
| `CADDY_TLS` | `internal` for LAN, or an email for Let's Encrypt on a public domain |

`AUTH_SECRET` also encrypts stored social-media tokens. Changing it later
means re-entering those tokens under Admin → Automation.

`NEXT_PUBLIC_SITE_URL` is baked in at build time. If you change it, rebuild
(`deploy/scripts/deploy.sh`).

## 4. Start it

```bash
docker compose -f docker-compose.prod.yml up -d --build
deploy/scripts/seed.sh        # first time only: Super Admin + categories
```

`seed.sh` is safe to re-run: it resets the Super Admin password to
`ADMIN_PASSWORD` and adds missing categories, but never deletes deals unless
you run `SEED_WIPE=1 deploy/scripts/seed.sh`.

## 5. Reach it from your PC (LAN)

1. Point the hostname at the VM: add `<VM-IP>  ourdeals.lan` to your hosts file
   (Windows: `C:\Windows\System32\drivers\etc\hosts`), or add a DNS record on
   your router / Pi-hole.
2. With `CADDY_TLS=internal`, browsers warn until you trust Caddy's root CA:
   ```bash
   docker compose -f docker-compose.prod.yml cp \
     caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
   ```
   Import `caddy-root.crt` into "Trusted Root Certification Authorities"
   (Windows: double-click → Install Certificate → Local Machine).

## 6. Cron + backups

```bash
sudo cp deploy/systemd/ourdealshub-*.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ourdealshub-cron.timer ourdealshub-backup.timer
systemctl list-timers 'ourdealshub-*'
```

Run either job by hand: `deploy/scripts/cron-daily.sh`, `deploy/scripts/backup.sh`.
Backups go to `/var/backups/ourdealshub` (newest 14 kept). The backup service
runs as root, so the directory is created automatically.

Restore:

```bash
gunzip -c /var/backups/ourdealshub/ourdealshub-YYYYMMDD-HHMMSS.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T db psql -U ourdealshub ourdealshub
```

## 7. Updating

```bash
deploy/scripts/deploy.sh      # git pull + rebuild + restart (migrations run first)
```

## Troubleshooting

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs migrate
```

- **App exits with "Security boot check failed"**: a production check in
  `src/lib/security-boot.ts` failed (short secret, http/localhost site URL,
  short `CRON_SECRET`, weak `ADMIN_PASSWORD`). The log line names it.
- **Login redirects to the wrong host**: `AUTH_URL` / `NEXTAUTH_URL` don't
  match the URL in the browser.

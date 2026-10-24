# Shared helpers for the deploy scripts. Source it; don't run it.
# Moves to the repo root and defines `compose`, which uses sudo only when the
# current user can't reach the Docker socket (e.g. right after install, before
# the docker group membership takes effect).

cd "$(dirname "${BASH_SOURCE[0]}")/../.."
ROOT="$(pwd)"
COMPOSE_FILE="docker-compose.prod.yml"

if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
else
  DOCKER=(sudo docker)
fi

compose() {
  "${DOCKER[@]}" compose -f "$COMPOSE_FILE" "$@"
}

say()  { printf '\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33m!!  %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[31mxx  %s\033[0m\n' "$*" >&2; exit 1; }

# Read one value from .env (no shell evaluation of the file).
env_get() {
  sed -n "s/^$1=//p" .env 2>/dev/null | tail -n1 | sed 's/^"\(.*\)"$/\1/'
}

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ourdealshub}"

# install.sh gives the deploy user the backup folder, so no sudo is needed;
# fall back to sudo on older installs where root owns it.
run_backup() {
  if [[ -w "$BACKUP_DIR" ]]; then
    BACKUP_DIR="$BACKUP_DIR" "$ROOT/deploy/scripts/backup.sh"
  else
    sudo BACKUP_DIR="$BACKUP_DIR" "$ROOT/deploy/scripts/backup.sh"
  fi
}

# Wait until the app answers its home page from inside the container.
# The home page queries the database, so a 200 means app + DB are up.
wait_for_app() {
  local timeout="${1:-120}" waited=0
  while (( waited < timeout )); do
    if compose exec -T app node -e '
      fetch("http://127.0.0.1:3000/").then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))
    ' </dev/null >/dev/null 2>&1; then
      return 0
    fi
    sleep 3
    waited=$((waited + 3))
  done
  return 1
}

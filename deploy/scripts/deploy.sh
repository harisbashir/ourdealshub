#!/usr/bin/env bash
# Update production to the latest main branch:
#   1. back up the database (migrations may change it)
#   2. git pull
#   3. build the new images while the old version keeps serving
#   4. restart (migrations run first) and wait for the app to answer
#
#   deploy/scripts/deploy.sh            # or: ourdeals update
#   deploy/scripts/deploy.sh --force    # rebuild even if there are no new commits
set -euo pipefail
source "$(dirname "$0")/lib.sh"

FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

[[ -f .env ]] || die "No .env here. Run deploy/scripts/install.sh first."
if ! git diff --quiet || ! git diff --cached --quiet; then
  die "There are local edits to tracked files on this server. Commit them elsewhere, or discard with: git checkout -- ."
fi

OLD=$(git rev-parse --short HEAD)
say "Fetching updates"
git pull --ff-only --quiet
NEW=$(git rev-parse --short HEAD)

if [[ "$OLD" == "$NEW" && $FORCE -eq 0 ]]; then
  say "Already up to date ($NEW). Use --force to rebuild anyway."
  exit 0
fi
[[ "$OLD" != "$NEW" ]] && git --no-pager log --oneline "$OLD..$NEW"

fail() {
  compose logs --tail=60 app migrate || true
  warn "$1 Logs are above."
  warn "Roll back the code:  git reset --hard $OLD && deploy/scripts/deploy.sh --force"
  warn "If a migration broke data, restore the backup:  ourdeals restore <file>  (ourdeals backups lists them)"
  exit 1
}

if [[ -n "$(compose ps -q db 2>/dev/null)" ]]; then
  say "Backing up the database"
  run_backup
fi

say "Building $NEW (the site stays up meanwhile)"
compose build || die "Build failed; the old version is still running. Roll back with: git reset --hard $OLD"

say "Restarting (database migrations run first)"
compose up -d --remove-orphans || fail "Restart failed (often a migration error)."
wait_for_app 120 || fail "The app isn't answering after the update."

"${DOCKER[@]}" image prune -f >/dev/null
compose ps
say "Deployed $NEW"

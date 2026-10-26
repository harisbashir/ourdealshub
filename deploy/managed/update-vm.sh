#!/usr/bin/env bash
# Run locally from the repository. Builds an isolated release, migrates, then
# switches current. sudo is needed only for restarting the native VM service.
set -euo pipefail
cd "$(dirname "$0")/../.."
remote="${VM_SSH:-haris@192.168.2.232}"
base=/opt/ourdealshub-managed
release="$(date -u +%Y%m%dT%H%M%SZ)"
ssh "$remote" "mkdir -p $base/releases/$release"
rsync -az --exclude=.git --exclude=node_modules --exclude=.next --exclude='.env*' --exclude=backups --exclude='*.tsbuildinfo' ./ "$remote:$base/releases/$release/"
ssh "$remote" bash -s -- "$base" "$release" <<'REMOTE'
set -euo pipefail
base="$1"; release="$2"
trap 'if [[ -f "$base/current/scripts/record-operation.mjs" ]]; then /opt/node22/bin/node --env-file="$base/.env" "$base/current/scripts/record-operation.mjs" "Deployment failed" "Review build or migration logs." error || true; fi' ERR
export PATH=/opt/node22/bin:$PATH NEXT_TELEMETRY_DISABLED=1
cd "$base/current"
node --env-file="$base/.env" scripts/backup-db.mjs
cd "$base/releases/$release"
ln -s "$base/.env" .env
npm ci --include=dev --no-audit --no-fund
npm run build
# Apply only backward-compatible migrations: a code rollback does not undo DDL.
node --env-file="$base/.env" node_modules/prisma/build/index.js migrate deploy
readlink "$base/current" > "$base/previous-release"
ln -s "releases/$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
REMOTE
ssh -t "$remote" "sudo systemctl restart ourdealshub-managed.service"
ssh "$remote" bash -s <<'REMOTE'
set -euo pipefail
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:3000/ >/dev/null; then
    /opt/node22/bin/node --env-file=/opt/ourdealshub-managed/.env /opt/ourdealshub-managed/current/scripts/record-operation.mjs 'Deployment completed' 'The new application release passed its health check.'
    echo 'New release is healthy'
    exit 0
  fi
  sleep 2
done
/opt/node22/bin/node --env-file=/opt/ourdealshub-managed/.env /opt/ourdealshub-managed/current/scripts/record-operation.mjs 'Deployment health check failed' 'Review the application service and deployment logs.' error || true
echo 'Health check failed. Previous target is in /opt/ourdealshub-managed/previous-release.' >&2
exit 1
REMOTE

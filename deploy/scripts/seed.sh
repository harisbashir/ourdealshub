#!/usr/bin/env bash
# Create/refresh the Super Admin (ADMIN_EMAIL / ADMIN_PASSWORD from .env) and
# the starter categories. Safe to re-run: never deletes deals unless you pass
# SEED_WIPE=1 explicitly (e.g. `SEED_WIPE=1 deploy/scripts/seed.sh`).
set -euo pipefail
cd "$(dirname "$0")/../.."

docker compose -f docker-compose.prod.yml run --rm \
  -e ALLOW_PROD_SEED=1 -e SEED_WIPE="${SEED_WIPE:-0}" \
  migrate npm run db:seed

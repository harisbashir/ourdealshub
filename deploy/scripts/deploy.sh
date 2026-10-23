#!/usr/bin/env bash
# Pull the latest main branch, rebuild and restart the stack.
# Migrations run automatically (the "migrate" service) before the app starts.
set -euo pipefail
cd "$(dirname "$0")/../.."

git pull --ff-only
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
docker image prune -f >/dev/null
docker compose -f docker-compose.prod.yml ps

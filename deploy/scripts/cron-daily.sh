#!/usr/bin/env bash
# Daily job: publish scheduled drafts, link-health check, Telegram digest,
# prune old clicks. Calls the app from inside its container so no TLS / DNS
# is involved; CRON_SECRET comes from the container's environment.
set -euo pipefail
cd "$(dirname "$0")/../.."

docker compose -f docker-compose.prod.yml exec -T app node -e '
fetch("http://127.0.0.1:3000/api/cron/daily", {
  headers: { authorization: "Bearer " + process.env.CRON_SECRET },
})
  .then(async (r) => { console.log(r.status, await r.text()); process.exit(r.ok ? 0 : 1); })
  .catch((e) => { console.error(e); process.exit(1); });
'

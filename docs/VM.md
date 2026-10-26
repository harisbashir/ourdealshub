# LAN managed-hosting compatibility environment

- VM: `haris@192.168.2.232`, Ubuntu 24.04, 2 GB RAM + 4 GB swap.
- Site: **https://ourdeals.lan** (same canonical hostname and trusted Caddy CA as before).
- Runtime: native Node 22 in `/opt/node22`; one Next.js process, 1 GB service
  memory ceiling, port 3000 on loopback only.
- Database: native MariaDB 10.11, port 3306 on loopback only; dedicated
  application user and database.
- HTTPS: native Caddy with a 120-second response timeout, standing in for the
  managed provider's proxy. No Docker dependency for the converted site.
- Current release: `/opt/ourdealshub-managed/current` points into `releases/`.
- Private environment: `/opt/ourdealshub-managed/.env`, mode 600.
- Services: `ourdealshub-managed`, `ourdealshub-https`, `mariadb`.
- Schedule: `/etc/cron.d/ourdealshub-managed`; maintenance 13:00 UTC,
  backup 03:30 UTC, social queue every five minutes, mail worker every minute. File locks prevent overlap.
- Backups: `/var/backups/ourdealshub-managed`, private compressed MariaDB dumps,
  newest 14 retained. Copy important backups off the VM too.

This reproduces the application requirements, not Hostinger's proprietary
LiteSpeed/hPanel platform, exact MariaDB version, build environment, quotas or
billing. Final acceptance on a purchased account remains necessary.

## Routine operations

```bash
ssh haris@192.168.2.232
ourdeals status
ourdeals logs
ourdeals backup
ourdeals backups
ourdeals cron                  # runs maintenance; may publish scheduled content
sudo systemctl restart ourdealshub-managed
```

From the local development checkout, deploy an isolated release:

```bash
bash deploy/managed/update-vm.sh
```

It copies source without secrets, backs up the DB, installs and builds in a
new release, applies migrations, switches `current`, restarts, and checks the
home page. The final restart may prompt for the VM's sudo password. Failed
builds leave the previous release serving. A failed health check requires
review and rollback; it does not undo database migrations automatically.

To switch code back, stop the app, point `current` at the previous release
(target recorded in `previous-release`), and restart. Restore a DB backup only
when required by a schema/data change; a restore overwrites data added since
that backup.

For a MariaDB restore, stop the app and scheduled jobs, then import a chosen
private dump with `sudo mariadb <database>` (pipe `gzip -dc <backup>` to it).
Use the database name from the private environment, then verify and restart.

Mail setup, event coverage and delivery history: [EMAIL.md](EMAIL.md).
The mail worker checks the local app via `APP_HEALTH_URL=http://127.0.0.1:3000/`.

## Original PostgreSQL installation

The original checkout `/opt/ourdealshub`, original `.env`, Docker images,
containers and named volumes remain intact. Their automatic cron/backup timers
are disabled; original app, Caddy and PostgreSQL containers are stopped, with
restart policies disabled. Original PostgreSQL backups remain in
`/var/backups/ourdealshub`; the final export is private under
`/home/haris/ourdeals-migration/`.

To return to that installation, first back up the new MariaDB site, then stop
`ourdealshub-managed` and `ourdealshub-https`, disable the new cron file, and run
in `/opt/ourdealshub`:

```bash
docker compose -f docker-compose.prod.yml up -d
sudo systemctl enable --now ourdealshub-cron.timer ourdealshub-backup.timer
```

This serves the original PostgreSQL snapshot. Changes made after conversion
will not be present there. Do not run old and new scheduled jobs together.

The hourly Amazon offer refresh uses `scripts/cron-amazon.mjs` and shares the daily
job lock. See [Discounts](DISCOUNTS.md) for savings freshness and fallback behavior.

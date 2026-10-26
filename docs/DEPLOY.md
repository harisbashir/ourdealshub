# Hostinger managed Node.js deployment

Target: **Business/Unlimited with Node.js web apps**, Node **22**, and the
included **MariaDB/MySQL database**. No VPS, Docker, Caddy, root access, or
persistent background worker is required by the app.

Hostinger documentation checked October 26, 2026:
- [Node.js app setup](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Limits](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/)
- [MariaDB](https://www.hostinger.com/support/1583226-which-database-management-system-is-used-at-hostinger/)
- [Scheduled Node scripts](https://www.hostinger.com/support/how-to-run-cron-jobs-for-node-js-websites-at-hostinger/)

For a complete fresh installation, follow [Hostinger installation](HOSTINGER.md).
The reference below covers deployment settings, migration and maintenance.

## First deployment

1. In hPanel, create a MariaDB database and user. Record the exact database
   host, port, username and database name shown by Hostinger.
2. Add a Node.js Web App from this GitHub repository (or a source ZIP).
   Select **Next.js**, **Node 22**, repository root.
3. Add environment variables from `.env.example`. Set at least:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/DATABASE?connection_limit=5` |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` |
   | `AUTH_URL`, `NEXTAUTH_URL` | Same HTTPS origin |
   | `AUTH_SECRET`, `NEXTAUTH_SECRET` | Same random value, at least 32 characters |
   | `CRON_SECRET` | Random value, at least 16 characters |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial admin credentials; strong password |
   | `NODE_ENV` | `production` |

   Percent-encode database credentials in the URL. Keep the existing
   `AUTH_SECRET` when transferring a site: it decrypts stored API, social and mail credentials.
   `SITE_DOMAIN`, `CADDY_TLS`, and `MARIADB_PASSWORD` are Docker/VM settings and
   are not needed by the managed Node app.
4. Install with `npm ci --include=dev`. Use build command
   **`npm run build:hostinger`**, which applies MariaDB migrations and then
   runs the production build. It needs database access in the build environment.
   The regular `npm run build` remains usable without a database.
5. Use **`npm start`** / Next.js's standard Node start command and `.next`
   output. Let Hostinger assign the listening port (`PORT`); do not set a custom
   port or use a static export. Leave `NEXT_OUTPUT` unset.
6. For a NEW empty site, initialize the administrator and categories using the
   [one-time Node command](HOSTINGER.md#5-create-the-initial-administrator).
   If importing existing data, import it instead; **do not seed** (seeding can
   reset the Super Admin password).
7. Sign in at `/admin`. Configure tracking IDs and API keys in the admin panel.
   Test imports manually after API credentials are provided.

Select `npm run build:hostinger` in the build settings so migrations run before
the application is built. Keep build dependencies available during installation
and `tsx` available at runtime for scheduled jobs. For SSH initialization use
the direct Node command in the installation guide; do not assume `npm` is
available through managed-hosting SSH.

## Daily maintenance

The app has no always-running worker. In hPanel **Advanced → Cron Jobs**, choose
a Node.js job at **13:00 UTC daily**. Following Hostinger's documented paths:

```text
/opt/alt/alt-nodejs22/root/bin/node --env-file=/home/USER/domains/DOMAIN/hbuilds/config/.env /home/USER/domains/DOMAIN/hbuilds/current/nodejs/scripts/cron-daily.mjs
```

Replace `USER`/`DOMAIN` and confirm the actual paths after deployment. Keep the
command within Hostinger's 255-character limit. The environment file is outside
`public_html`, private, and never committed. hPanel cron does not inherit the
web process's environment automatically.

This finite script runs scheduled publishing, Amazon refresh, untagged link
checks, the configured Telegram digest, and click retention. Hostinger permits
up to 30 minutes for cron scripts, compared with 120 seconds for a web request.
The protected `/api/cron/daily` endpoint remains for compatibility, but use the
script for managed hosting. Do not run both schedules.

## Social publishing and sample catalog

Schedule `scripts/cron-social.mjs` every five minutes as a second Node.js cron job,
using the same `--env-file` pattern as the daily job. Social delivery now runs in
this durable queue, outside web requests. Setup and permissions for all five
channels are in [SOCIAL.md](SOCIAL.md).

Canada uses separate `AMAZON_CA_CREDENTIAL_ID`, `AMAZON_CA_CREDENTIAL_SECRET`,
and `AMAZON_CA_CREDENTIAL_VERSION` settings, plus each admin's Amazon.ca tracking
ID. Configure them under Settings → API Keys and Admins.

For previews, Settings → Samples adds/removes 12 labeled, non-shopping listings.
Remove them before launching a real public catalog.

## Administrator email

Configure Gmail, Outlook or custom SMTP under Settings → Email notifications.
Schedule `scripts/cron-mail.mjs` every minute, using the same Node 22 `--env-file`
pattern as the other jobs. SMTP credentials are encrypted and alerts start paused.
Full setup and monitoring scope: [EMAIL.md](EMAIL.md).

## Backups and data migration

Use Hostinger's database backups/export, with an independent copy retained.
Where `mariadb-dump` is available, `npm run db:backup` creates a private,
compressed, consistent SQL dump; `DB_DUMP_BIN=mysqldump` selects that executable
instead. `BACKUP_DIR` must be outside publicly served folders, and defaults to
`backups/`. It keeps 14 successful dumps by default (`BACKUP_KEEP`).

To transfer an existing MariaDB installation to Hostinger:

1. Pause edits/scheduled jobs for the final transfer and take a fresh MariaDB dump.
2. Restore to the empty Hostinger DB (phpMyAdmin import or MariaDB client).
3. Transfer the same authentication secrets and production settings privately.
4. Change URL variables to the public domain and rebuild. Verify the admin,
   storefront, analytics, API keys and cron before changing DNS permanently.

For installations using PostgreSQL, retain a backup for rollback.
`prisma/postgresql/` holds the original schema/migrations. Those files are an
archive, not migrations for the new database. `scripts/transfer-data.mjs`
exports using the original generated PostgreSQL client and imports/verifies
using the new MySQL client, preserving IDs, timestamps, ownership, password
hashes and encrypted fields. It refuses to import into nonempty tables and
compares every scalar field. Dumps/exports contain secrets; never put them in
the repository or serve them publicly.

## Updates

Use GitHub deployments after testing. Keep migrations backward-compatible:
MariaDB schema changes are not automatically undone when code is rolled back.
Take a database backup before deployment. Verify `/`, `/admin/login`, signed-in
admin pages, and the scheduled job after each deployment.

## Optional Docker deployment

`docker-compose.prod.yml` remains available for self-hosting. It now uses
MariaDB 10.11 with a separate `mariadb_data` volume and `MARIADB_PASSWORD`.
The Dockerfile explicitly requests Next's standalone output. Existing PG
installations require a data export/import; never reuse their `pgdata` volume
or pull this conversion and run the old installer over them.

For the hourly offer refresh and verified savings badges, see [Discounts](DISCOUNTS.md).

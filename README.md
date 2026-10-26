# OurDealsHub

An Amazon Associates deals site: a public storefront of hand-picked products
and a multi-admin panel for adding, writing up, publishing and sharing them.

## Features

**Storefront**

- Home, Browse, categories, search, and US / UK / Canada store switching (remembered per device)
- Product pages with a "Get deal on Amazon" paid link, Save (kept on the device) and Share
- Prominent verified savings percentages, comparison basis and freshness details;
  expired discounts disappear automatically, including in an open tab
- Light, dark or system appearance; phone layout with a bottom tab bar; installable to the home screen
- Blog, help page, and the disclosure, privacy and terms pages Amazon requires
- No visitor accounts or tracking cookies

**Admin panel** (`/admin`)

- Add a deal from an Amazon URL or ASIN: details come from the Amazon
  **Creators API**, and Gemini writes the description from an editable master prompt
- Drafts, review, scheduled publishing, and auto-posting to Facebook, Threads, Telegram, Instagram and Pinterest
- Click analytics, link-health checks, CSV export
- Roles: **Super Admin** (everything) and **Admin** (only their own deals, under their own tracking ID)
- Super Admin settings: API keys (stored encrypted), colour theme (9 accent colours), master prompt
- Separate Amazon API credentials and per-admin tracking IDs for US, UK and Canada
- Durable social publishing queue with delivery history and explicit review of uncertain posts
- Gmail, Outlook and custom SMTP alerts, activity digests, test messages and delivery history
- Twelve original illustrated sample listings, clearly marked as previews
- Built-in help at `/admin/help`

**Amazon content safeguards.** Real savings badges use only verified Amazon API
percentages, with timestamps and expiry. Manual prices, discounts, coupons,
ratings and urgency claims remain blocked. Images stay on Amazon's servers.
Offers refresh hourly; generated copy is checked before saving. See
[Discounts](docs/DISCOUNTS.md) and
[CLAUDE.md](CLAUDE.md) for the full rules.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind 4 · Prisma 5 · MariaDB · Auth.js v5.
Node 22 is required (`.nvmrc`).

## Hosting

Deploy on managed Node.js hosting with Node 22 and a MariaDB/MySQL database.
For Hostinger, use a plan that includes **Node.js Web Apps**; a VPS is not required.

Start with the [Hostinger installation guide](docs/HOSTINGER.md) for database
creation, GitHub deployment, administrator setup and scheduled jobs. General
migration, backup and update guidance is in [Deployment](docs/DEPLOY.md).

**Existing PostgreSQL installations:** this version changes the active database
provider to MariaDB. Back up and transfer data before upgrading; the MySQL
migrations cannot be applied to a PostgreSQL database. The archived schema,
transfer tooling and rollback instructions are documented in
[Deployment](docs/DEPLOY.md#backups-and-data-migration).

Social setup, permissions and the publishing queue: [docs/SOCIAL.md](docs/SOCIAL.md).
Use **Settings → Samples** to add/remove 12 clearly marked preview listings (four per store).
Samples have no active affiliate links and never enter social automation.

Administrator email alerts (Gmail, Outlook and SMTP): [docs/EMAIL.md](docs/EMAIL.md).
Configure the account under **Settings → Email notifications** and schedule the
mail worker each minute. Alerts stay paused until you enable them.

## Configuration after deployment

1. Set each admin's tracking IDs under **Admins** and save the relevant Amazon
   Creators API credentials under **Settings → API Keys**. Real savings appear
   only when Amazon returns a current eligible offer; there is no manual override.
2. Add Gemini credentials for generated product write-ups, or use manual entry.
3. Connect social channels under **Automation**. Instagram and Pinterest need
   public HTTPS access to the original share images. Samples never enter the publishing queue.
4. Configure email under **Settings → Email notifications**, send a test, then
   enable alerts. Gmail uses a Google App Password; personal Outlook uses
   Microsoft OAuth sign-in. Credentials are stored encrypted.
5. Add real products and remove sample listings before public launch. Sample
   savings are illustrative, and their **Preview deal** buttons stay on the site.

## Scheduled jobs

Managed hosting runs finite Node scripts instead of resident background workers.
Configure the jobs with the deployment environment and a private environment
file. The [Hostinger installation guide](docs/HOSTINGER.md#7-configure-scheduled-jobs)
includes the commands and hPanel setup steps.

| Job | Suggested schedule (UTC) | Purpose |
| --- | --- | --- |
| `scripts/cron-mail.mjs` | Every minute | Activity digests, health checks and mail delivery |
| `scripts/cron-social.mjs` | Every 5 minutes | Process queued social posts |
| `scripts/cron-amazon.mjs` | Hourly at minute 17 | Refresh Amazon data and eligible savings |
| `scripts/cron-daily.mjs` | Daily at 13:00 | Scheduled publishing, maintenance and retention |
| `scripts/backup-db.mjs` | Daily at 03:30 | Private compressed MariaDB backups |

Email reports application activity and operations; independent monitoring is
needed to detect a hosting outage or failure of the database or scheduler itself.

## Local development

```bash
nvm use
npm ci
cp .env.example .env       # configure secrets and the mysql:// database URL
npm run db:up              # optional MariaDB container on localhost:3306
npm run db:migrate
npm run db:seed
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm test` | Unit tests |
| `npm run test:db` | MariaDB integration checks (empty database ending `_test` required) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type checking |
| `npm run build` | Production build, no database required |
| `npm run build:hostinger` | Apply MariaDB migrations, then build |
| `npm start` | Production Node server; uses platform `PORT` |
| `npm run db:migrate:dev` | Create a migration after schema changes |
| `npm run cron:daily` | Finite maintenance job, environment loaded from `.env` |
| `npm run cron:amazon` | Refresh Amazon data and verified savings |
| `npm run cron:social` | Process the social delivery queue |
| `npm run cron:mail` | Check system health and process administrator mail |
| `npm run db:demo` | Add the sample catalog (also available in Settings) |
| `npm run db:backup` | Private compressed MariaDB dump |

Project conventions and the rules for Amazon content, affiliate tracking,
authorization, stable URLs and design tokens are in [CLAUDE.md](CLAUDE.md).
The original PostgreSQL schema/migrations are archived in `prisma/postgresql/`.

Secrets remain in the deployment environment. Preserve `AUTH_SECRET` across
migration: it encrypts API keys, social tokens and mail credentials. Production
refuses weak secrets or a non-HTTPS site URL.

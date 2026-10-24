# OurDealsHub

An Amazon Associates deals site: a public storefront of hand-picked products
and a multi-admin panel for adding, writing up, publishing and sharing them.

## Features

**Storefront**
- Home, Browse, categories, search, and US / UK store switching (remembered per device)
- Product pages with a "View on Amazon" paid link, Save (kept on the device) and Share
- Light, dark or system appearance; phone layout with a bottom tab bar; installable to the home screen
- Blog, help page, and the disclosure, privacy and terms pages Amazon requires
- No visitor accounts or tracking cookies

**Admin panel** (`/admin`)
- Add a deal from an Amazon URL or ASIN: details come from the Amazon
  **Creators API**, and Gemini writes the description from an editable master prompt
- Drafts, review, scheduled publishing, and auto-posting to Facebook, Threads and Telegram
- Click analytics, link-health checks, CSV export
- Roles: **Super Admin** (everything) and **Admin** (only their own deals, under their own tracking ID)
- Super Admin settings: API keys (stored encrypted), colour theme (9 accent colours), master prompt
- Built-in help at `/admin/help`

**Amazon compliance is built in.** No prices, discounts, coupons, ratings or urgency
claims are stored or shown. Images stay on Amazon's servers. Product data refreshes
daily (Amazon's 24-hour limit). Generated copy is checked before saving. See
[CLAUDE.md](CLAUDE.md) for the full rules.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 5 +
PostgreSQL 16 · Auth.js v5 · Docker Compose + Caddy (automatic HTTPS) in production.

## Production server

One Ubuntu 24.04 / Debian 12 server (2 vCPU and 4 GB RAM recommended) runs everything:
Postgres, the app and Caddy, plus daily cron and nightly backups.

### First install

The repo is private, so the server needs read access. Give it a deploy key
(run on the server):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/ourdealshub_deploy -N "" -C "ourdealshub server"
printf 'Host github.com\n  IdentityFile ~/.ssh/ourdealshub_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
cat ~/.ssh/ourdealshub_deploy.pub
```

Add that key on GitHub under **repo Settings → Deploy keys** (read-only), then:

```bash
sudo mkdir -p /opt/ourdealshub && sudo chown "$USER": /opt/ourdealshub
git clone git@github.com:harisbashir/ourdealshub.git /opt/ourdealshub
/opt/ourdealshub/deploy/scripts/install.sh
```

The installer:
- asks for the domain, admin email and certificate type
- installs Docker if needed and generates every secret into `.env`
- builds and starts the site and creates the Super Admin
- turns on the daily cron and nightly backups
- prints the admin password

For a public domain, point its DNS A record at the server and open ports 80 and
443 before running it, so Let's Encrypt can issue the certificate.

### Updating

Push to `main`, then on the server:

```bash
ourdeals update
```

Or from your own machine: `ssh <user>@<server> ourdeals update`.

`update` does these steps in order:
1. Backs up the database.
2. Pulls the new code.
3. Builds it while the old version keeps serving.
4. Restarts, running database migrations first.
5. Checks the site answers.

If it fails, it prints the logs and the exact rollback commands.

### Everyday commands

| Command | What it does |
|---------|--------------|
| `ourdeals status` | Version, containers, timers |
| `ourdeals logs` | Follow app logs (`ourdeals logs caddy` for the web server) |
| `ourdeals backup` / `backups` | Back up now / list backups (`/var/backups/ourdealshub`, newest 14 kept) |
| `ourdeals restore <file>` | Restore a backup (asks for confirmation) |
| `ourdeals cron` | Run the daily job now |
| `ourdeals restart` | Restart the app and web server |
| `ourdeals cert` | Export the HTTPS root certificate (LAN installs) |

Details, manual steps and troubleshooting: [docs/DEPLOY.md](docs/DEPLOY.md).

### After the first sign-in

1. Change the admin password.
2. **Admin → Settings → API Keys**: add a Gemini key (from a billing-enabled
   Google project) and your Amazon Creators API credentials (Associates Central →
   Tools → Creators API). Press **Test** on each.
3. **Admin → Admins**: set your Amazon tracking ID (and one per staff admin).

Without API keys the site still works. You enter deals manually and write the
descriptions yourself.

## Local development

Requires **Node.js 20+** (22 recommended) and Docker for the local database.

```bash
npm install
cp .env.example .env        # set ADMIN_PASSWORD and AUTH_SECRET (32+ chars)
npm run db:up               # Postgres on localhost:5432
npm run db:migrate
npm run db:seed             # Super Admin + categories
npm run dev                 # http://localhost:3000
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm test` | Unit tests |
| `npm run lint` · `npx tsc --noEmit` | Lint and type-check |
| `npm run build` | Production build (works without a database) |
| `npm run db:migrate:dev` | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Seed again (idempotent; `SEED_WIPE=1` deletes deals) |
| `npm run db:studio` | Database browser |

Project layout, conventions and the rules that must not be broken (Amazon
compliance, tracking IDs, permissions, design tokens) are in [CLAUDE.md](CLAUDE.md).

## Security

- Secrets live only in the server's `.env` (never committed). API keys added in
  Settings are encrypted with `AUTH_SECRET`, so changing it means re-entering them.
- In production the app refuses to start with weak or missing secrets, or a
  non-HTTPS site URL.
- Admin sign-in is rate limited. Every server action checks permissions, not just the middleware.

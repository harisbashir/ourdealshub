# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo.

## What this is

OurDealsHub: an Amazon Associates affiliate deals site. Public storefront
(`src/app/(site)`) + multi-admin panel (`src/app/admin`). Admins import Amazon
products (ASIN/URL → Amazon API → Gemini rewrite → publish); visitors click
through `/go/[slug]`, which logs the click and 302s to the stored affiliate URL.

Stack: Next.js 15 App Router · React 19 · TypeScript (strict) · Tailwind 4 ·
Prisma 5 + PostgreSQL · Auth.js v5 (credentials, JWT sessions) · zod 4.

## Commands

```bash
npm run db:up            # local Postgres via docker-compose.yml (dev only)
npm run db:migrate       # prisma migrate deploy
npm run db:migrate:dev   # create a new migration after editing schema.prisma
npm run db:seed          # Super Admin + categories (idempotent; SEED_WIPE=1 to wipe)
npm run dev              # http://localhost:3000
npm test                 # node:test via tsx. Add new *.test.ts files to the script
npm run lint
npx tsc --noEmit
npm run build            # must succeed WITHOUT a database (see below)
```

**Node ≥ 20 is required** (Tailwind 4's native binary won't install on 18; npm
silently skips it and the build fails with "Cannot find native binding").

Self-hosted production: `docker-compose.prod.yml` + `docs/DEPLOY.md`.

## Layout

- `src/lib/`: all server logic. Key modules:
  - `import-product.ts`: Amazon → Gemini → save/publish pipeline (server actions)
  - `admin-actions.ts`: product/category/admin CRUD server actions
  - `amazon.ts`: Amazon API client (**PA-API 5, retired by Amazon in 2026, see below**)
  - `gemini.ts`: Gemini REST call; output must be JSON `{title, description}`
  - `associates-claims.ts`: blocks prices / % off / coupons / "best deal" copy
  - `permissions.ts`, `admin-auth.ts`, `auth.ts`, `auth.config.ts`: authz
  - `rate-limit.ts` (in-memory) / `rate-limit-durable.ts` (Postgres `RateBucket`)
  - `secret-box.ts`: AES-GCM for social tokens, key derived from `AUTH_SECRET`
  - `social-publish.ts`: auto-post to Facebook / Threads / Telegram
  - `link-check.ts`: affiliate link health (used by daily cron)
- `src/app/api/cron/daily`: scheduled publish + link check + Telegram digest;
  `Authorization: Bearer $CRON_SECRET` only
- `src/middleware.ts`: edge auth gate for `/admin` and `/api/admin`
- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- `deploy/`: Caddyfile, systemd timers, deploy/seed/backup/cron scripts

## Rules that must not be broken

**Amazon Associates compliance** (account-termination risk):
- Never store or display prices, discounts, "% off", coupon codes, ratings, or
  scarcity claims. `couponCode` is always written as `null`.
- Product images stay as Amazon CDN URLs. Never download or rehost them.
- All generated or edited copy goes through `associatesClaimError()` before saving.

**Tracking IDs / commission**:
- The partner tag is always loaded from the DB for the deal's owner
  (`getAdminTrackingId`), never from the request/client.
- Updating an existing deal keeps its owner and their tag. Use
  `trackingIdForProductUpdate()` (admin-tracking.ts). Never set
  `createdById: admin.id` on an update.
- `/go/[slug]` only redirects to URLs passing `isSafeAffiliateRedirectUrl()`.

**Authorization**: check permissions in every server action and route
(`requireProductAccess` / `requireSuperAdmin` + `canManageOwnedProduct`), not
only in middleware. Staff admins see/modify only their own deals.

**One deal per ASIN + marketplace** across all admins (US and UK are separate).

## Gotchas

- **Build must not need a DB.** Public pages and the sitemap use
  `dynamic = "force-dynamic"`. Don't add `revalidate`/static generation to
  anything that queries Prisma, or `next build` (and the Docker build) breaks.
- `NEXT_PUBLIC_SITE_URL` is inlined at build time. In Docker it's a build arg.
- In `NODE_ENV=production`, `security-boot.ts` refuses to start unless
  `NEXT_PUBLIC_SITE_URL` is https and not localhost, secrets are ≥32 chars,
  `CRON_SECRET` ≥16 chars, and `ADMIN_PASSWORD` isn't weak.
- Rotating `AUTH_SECRET` makes stored social tokens undecryptable. The
  `abdealspoint:v1:` string in `secret-box.ts` is a KDF label. Don't rename it.
- `clientIp()` trusts `X-Real-IP` first. The reverse proxy must overwrite it
  (the Caddyfile does).
- Click analytics rate limiting is in-memory (fine on one server, not on serverless).
- The repo was created on Windows; the git repo uses `core.fileMode=false`.
  Mark scripts executable with `git update-index --chmod=+x <file>`.
- **Amazon PA-API 5 was retired (Apr/May 2026).** Calls now return 403.
  Importing / refreshing from Amazon won't work until `amazon.ts` is migrated to
  the Creators API (OAuth client-credentials, lowerCamelCase fields,
  `creatorsapi.amazon/catalog/v1`). Manual deal entry still works.

## Conventions

- Server-only logic in `src/lib`; mutations are server actions (`"use server"`)
  that return result objects or throw `Error` with a user-facing message.
- Validate external input with zod or explicit checks; trim and length-cap strings.
- Comments explain *why* (policy, security), not what.
- Commits: small and focused, imperative subject, body explains the reason.

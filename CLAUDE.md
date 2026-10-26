# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo.

## What this is

OurDealsHub: an Amazon Associates affiliate deals site. Public storefront
(`src/app/(site)`) + multi-admin panel (`src/app/admin`). Admins import Amazon
products (ASIN/URL → Amazon API → Gemini rewrite → publish); visitors click
through `/go/[slug]`, which logs the click and 302s to the stored affiliate URL.

Stack: Next.js 15 App Router · React 19 · TypeScript (strict) · Tailwind 4 ·
Prisma 5 + MariaDB (Prisma mysql provider) · Auth.js v5 (credentials, JWT sessions) · zod 4.

## Commands

```bash
npm run db:up            # local MariaDB via docker-compose.yml (dev only)
npm run db:migrate       # prisma migrate deploy
npm run db:migrate:dev   # create a new migration after editing schema.prisma
npm run db:seed          # Super Admin + categories (idempotent; SEED_WIPE=1 to wipe)
npm run dev              # http://localhost:3000
npm test                 # node:test via tsx. Add new *.test.ts files to the script
npm run lint
npx tsc --noEmit
npm run build            # must succeed WITHOUT a database (see below)
```

**Node 22 is required** (`.nvmrc`). Node 18 is unsupported.

Managed production: Hostinger Business/Unlimited Node.js + MariaDB; see
`docs/DEPLOY.md`. `npm run build:hostinger` applies MySQL migrations then builds.
`npm run build` stays database-independent. `scripts/cron-daily.mjs` runs daily
maintenance outside HTTP (Hostinger has a 120s web-request limit).
The LAN VM uses native Node 22 + MariaDB, with systemd/Caddy standing in for
platform process management/HTTPS. See `docs/VM.md` and `deploy/managed/`.
Docker remains optional; its database uses a new `mariadb_data` volume.
Never point MariaDB at a PostgreSQL data volume or run MySQL migrations against PG.
Original PostgreSQL schema/migrations are archived under `prisma/postgresql/`.

## Layout

- `src/lib/`: all server logic. Key modules:
  - `import-product.ts`: Amazon → Gemini → save/publish pipeline (server actions)
  - `admin-actions.ts`: product/category/admin CRUD server actions
  - `amazon.ts`: Amazon **Creators API** client (OAuth2 token cache, GetItems,
    batch refresh). PA-API 5 was retired by Amazon in 2026
  - `amazon-sync.ts`: daily Creators API refresh (24h caching limit, removes
    unavailable items with a two-strike rule)
  - `api-config.ts`: API keys managed in Admin → Settings (`ApiCredential`
    table, sealed with secret-box) with env fallback. Read keys via
    `getApiConfig()`, never `process.env` directly
  - `gemini.ts`: Gemini REST call; JSON `{title, description}` enforced by a
    response schema; default model in `api-config.ts`
  - `associates-claims.ts`: blocks prices / % off / coupons / "best deal" copy
  - `permissions.ts`, `admin-auth.ts`, `auth.ts`, `auth.config.ts`: authz
  - `rate-limit.ts` (in-memory) / `rate-limit-durable.ts` (MariaDB `RateBucket`)
  - `secret-box.ts`: AES-GCM for social tokens, key derived from `AUTH_SECRET`
  - `social-publish.ts`: queue posts for Facebook / Threads / Telegram / Instagram / Pinterest;
    `scripts/cron-social.mjs` processes finite batches outside HTTP. Instagram
    and Pinterest use original editorial JPEGs from `/api/social-image/[slug]`,
    never Amazon images
  - `system-events.ts`: safe summaries after successful actions; never include
    passwords, tokens, request bodies or raw errors.
  - `mail-worker.ts` / `scripts/cron-mail.mjs`: finite mail queue with a lease;
    uncertain SMTP delivery needs manual review. Credentials are encrypted and
    browser views are explicit allowlists (`mail-settings.ts`). See `docs/EMAIL.md`.
  - `theme.ts` + `globals.css`: accent presets (`data-accent`), semantic tokens
  - `form-state.ts` / `form-actions.ts` + `components/admin/ActionForm.tsx`:
    admin forms return validation errors inline (thrown messages are hidden
    in production)
  - `saved.ts`, `market-preference.ts`: device-local stores (useSyncExternalStore)
  - `link-check.ts`: affiliate link health (used by daily cron)
- `src/app/api/cron/daily`: scheduled publish + link check + Telegram digest;
  `Authorization: Bearer $CRON_SECRET` only
- `src/middleware.ts`: edge auth gate for `/admin` and `/api/admin`
- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- `deploy/`: Caddyfile, systemd timers, deploy/seed/backup/cron scripts
- `src/components/admin/ui.tsx`: shared admin primitives (cards, headers,
  44px buttons, inputs, status badges)

## Rules that must not be broken

**Amazon Associates compliance** (account-termination risk):
- Do not accept prices, discounts, "% off", coupon codes, ratings or scarcity
  claims in authored copy. `couponCode` is always `null`. The owner requested
  verified savings badges: only trusted Creators API featured-offer percentages
  may populate `discount*` fields. Show timestamps/basis/disclaimer; hide at
  API promotion end or 24h, whichever comes first. No manual savings override.
  Explicitly labelled sample savings apply only to original `isDemo` previews.
  `cron-amazon.mjs` refreshes hourly; see `docs/DISCOUNTS.md`.
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

**Preview listings**: `isDemo=true` marks original illustrated sample data. Never
redirect these to Amazon, record affiliate clicks, refresh them via API, include
them in the sitemap or send them to social channels. Settings → Samples manages
only these entries.

**Social delivery**: preserve the unique deal/channel key and atomic claim.
Ambiguous platform writes must remain `uncertain` until an admin checks them;
never blindly retry them. See `docs/SOCIAL.md`.

**One deal per ASIN + marketplace** across all admins (US, UK and Canada are separate).

**Paid links**: use `AFFILIATE_LINK_REL` (never `noreferrer`) and keep `/go`'s
`strict-origin-when-cross-origin` referrer policy: Amazon must see the
referring site (Program Policies §6(v)). Automated checks must never request a
tagged Special Link (§6(s)); see `linkCheckProbeUrl()`.

**Stable URLs**: don't change a product slug once it's published or has clicks,
or a blog slug once published. Shared `/go/<slug>` and `/deal/<slug>` links
(social posts, Telegram) must keep working.

**Design system** (Apple HIG review): use the semantic Tailwind tokens
(`bg-card`, `text-muted`, `text-on-brand` on `bg-brand`, `text-success`…), never
raw palette colours like `gray-500` (they break dark mode and accent themes).
Body text ≥ 15px, nothing below 12px, touch targets ≥ 44px, blur only on bars
(`.bar-material`), product photos on `.shelf` tiles.

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
- **Amazon PA-API 5 was retired (Apr/May 2026).** The Creators API replaced
  it; credentials (ID, secret, version 2.x/3.x) are per Associates store and
  require recent qualifying sales. Manual deal entry works without them.
- Gemini models get retired: `isRetiredGeminiModel()` ignores dead ones;
  update `GEMINI_MODEL_OPTIONS` / `DEFAULT_GEMINI_MODEL` from
  ai.google.dev/gemini-api/docs/deprecations.
- `api-config` caches for 10s per module instance; server actions and page
  renders may hold separate instances, so admin screens read fresh.

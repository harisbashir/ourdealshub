# OurDealsHub

Amazon affiliate deals site with a public storefront and a secure multi-admin panel for managing deals.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + **PostgreSQL**
- Auth.js (NextAuth v5) credentials + role permissions
- Amazon Product Advertising API 5 (server-side only)
- Google Gemini for deal titles / descriptions

## Quick start

### 1. Database (PostgreSQL)

**Option A — Docker (recommended for local):**

```bash
npm run db:up
```

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/). Starts Postgres on `localhost:5432` with user/password/db `ourdealshub`.

**Option B — Hosted Postgres** (Neon, Supabase, Railway, etc.): put the connection string in `.env` as `DATABASE_URL`.

### 2. App

```bash
npm install
cp .env.example .env
# Edit .env — set strong ADMIN_PASSWORD + AUTH_SECRET (≥32 chars)
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin login uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (after seed).

## Admin roles

| Role | Access |
|------|--------|
| **Super Admin** | Dashboard, products, categories, manage admins, settings |
| **Admin** | Dashboard + product/deal management (if granted) |

Create more admins at **Admin → Admins → Add admin**. Passwords are bcrypt-hashed. Revoke or delete staff admins anytime. Super Admin accounts cannot be deleted by other users.

## Adding deals

1. Sign in → **Products → Add deal**
2. Paste an Amazon product URL → **Add Product**
3. Backend fetches title, description, Amazon CDN image URL, and affiliate link
4. Gemini writes the deal post from your master prompt (Admin → Settings)
5. With **Auto Publish ON**, the deal goes live immediately; with **OFF**, you review/edit first

Prices are intentionally not stored (Associates policy / volatility). Images stay as Amazon URLs — never downloaded or rehosted.

API keys (`AMAZON_*`, `GEMINI_API_KEY`) are server-only. Never put them in `NEXT_PUBLIC_*`.

## Amazon API credentials (critical)

Set these **only** in server `.env` (never commit real values, never use `NEXT_PUBLIC_`):

```
AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=
AMAZON_PARTNER_TAG=
AMAZON_PAAPI_HOST=webservices.amazon.com
AMAZON_PAAPI_REGION=us-east-1
AMAZON_MARKETPLACE=www.amazon.com
```

- Only the backend (`src/lib/amazon.ts` + `/api/admin/amazon/lookup`) talks to Amazon.
- The browser never receives access keys or secrets.
- Errors are sanitized and do not echo credentials.

You need an approved Amazon Associates account with Product Advertising API access.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run db:up` | Start local Postgres (Docker) |
| `npm run db:down` | Stop local Postgres |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production |
| `npx prisma migrate deploy` | Apply migrations |
| `npm run db:seed` | Seed Super Admin + categories (no sample products) |
| `npx prisma studio` | DB GUI |

## Security notes

- Set long `AUTH_SECRET` / `NEXTAUTH_SECRET` (≥32 chars) and a strong `ADMIN_PASSWORD` before production — boot checks will refuse weak defaults in `NODE_ENV=production`.
- Keep Amazon/Gemini keys server-only. Tracking IDs live per admin in the DB.
- Use PostgreSQL in production (this project defaults to Postgres; do not ship with SQLite).

## Affiliate note

Import real Amazon products via Admin (PA-API). Images must stay on Amazon CDN. Do not invent prices, % off, coupons, or savings claims. See `/disclosure`.

Use your own Associates tagged URLs.

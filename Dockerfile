# syntax=docker/dockerfile:1
#
# OurDealsHub — multi-stage image.
#   target "runner"  (default): slim Next.js standalone server
#   target "migrate": full toolchain for `prisma migrate deploy` / seed
#
# NEXT_PUBLIC_* values are inlined at build time, so NEXT_PUBLIC_SITE_URL
# must be passed as a build arg (docker-compose.prod.yml does this).

ARG NODE_IMAGE=node:22-bookworm-slim

# ---- deps: install exactly what the lockfile says ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ---- builder: compile the app ----
FROM deps AS builder
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

# ---- migrate: one-off schema migrations + optional seed ----
FROM builder AS migrate
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- runner: minimal production server ----
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

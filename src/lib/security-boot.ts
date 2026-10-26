/**
 * Startup security checks — warn loudly in all envs; throw in production
 * when critical secrets are missing or obviously insecure.
 */

const WEAK_PASSWORDS = new Set([
  "admin123",
  "change-me",
  "password",
  "password123",
  "12345678",
  "ourdealshub",
  "OurDealsHub",
]);

function authSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

export function runSecurityBootChecks(): void {
  const isProd = process.env.NODE_ENV === "production";
  const warnings: string[] = [];
  const fatals: string[] = [];

  const secret = authSecret();
  if (!secret) {
    const msg =
      "[security] AUTH_SECRET / NEXTAUTH_SECRET is missing. Sessions cannot be trusted.";
    if (isProd) fatals.push(msg);
    else warnings.push(msg);
  } else if (secret.length < 32) {
    const msg =
      "[security] AUTH_SECRET / NEXTAUTH_SECRET is shorter than 32 characters. Use a long random value.";
    if (isProd) fatals.push(msg);
    else warnings.push(msg);
  }

  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "";
  if (
    adminPassword &&
    (WEAK_PASSWORDS.has(adminPassword.toLowerCase()) || adminPassword.length < 8)
  ) {
    const msg =
      "[security] ADMIN_PASSWORD is weak or default. Change it before go-live (seed uses this for Super Admin).";
    if (isProd) fatals.push(msg);
    else warnings.push(msg);
  }

  const dbUrl = process.env.DATABASE_URL?.trim() || "";
  if (isProd && dbUrl.startsWith("file:")) {
    fatals.push(
      "[security] Production must not use SQLite (file:). Set DATABASE_URL to MariaDB (mysql://)."
    );
  } else if (dbUrl.startsWith("file:")) {
    warnings.push(
      "[security] DATABASE_URL is still SQLite. Switch to MariaDB (see docker-compose.yml / README)."
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  if (isProd) {
    if (!siteUrl) {
      fatals.push(
        "[security] NEXT_PUBLIC_SITE_URL is required in production (canonical HTTPS origin)."
      );
    } else if (/localhost|127\.0\.0\.1/i.test(siteUrl)) {
      fatals.push(
        "[security] NEXT_PUBLIC_SITE_URL must not be localhost in production (breaks SEO + social links)."
      );
    } else if (!/^https:\/\//i.test(siteUrl)) {
      fatals.push(
        "[security] NEXT_PUBLIC_SITE_URL must be an https:// origin in production."
      );
    }
  }

  const cron = process.env.CRON_SECRET?.trim() || "";
  if (isProd && cron.length < 16) {
    fatals.push(
      "[security] CRON_SECRET must be ≥16 random characters in production (protects /api/cron/daily)."
    );
  }

  for (const w of warnings) console.warn(w);
  if (fatals.length) {
    for (const f of fatals) console.error(f);
    throw new Error(
      `Security boot check failed:\n${fatals.join("\n")}\nFix .env and restart.`
    );
  }
}

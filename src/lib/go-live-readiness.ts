import { prisma } from "@/lib/prisma";
import { isAmazonConfigured } from "@/lib/amazon";
import { isGeminiConfigured } from "@/lib/gemini";

export type ReadinessItem = {
  id: string;
  label: string;
  ok: boolean;
  requiredForLaunch: boolean;
  detail: string;
  href?: string;
};

function authSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

/**
 * Go-live readiness (API keys optional until you add them).
 * Use on Super Admin dashboard / settings — does not block the app.
 */
export async function getGoLiveReadiness(): Promise<{
  items: ReadinessItem[];
  readyExceptApis: boolean;
  apisReady: boolean;
  dashboardComplete: boolean;
}> {
  const secret = authSecret();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  const dbUrl = process.env.DATABASE_URL?.trim() || "";
  const isProd = process.env.NODE_ENV === "production";

  const superAdmin = await prisma.adminUser.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    select: {
      amazonTrackingId: true,
      amazonTrackingIdUk: true,
      email: true,
    },
  });

  const adminsMissingTag = await prisma.adminUser.count({
    where: {
      isActive: true,
      role: "ADMIN",
      canManageProducts: true,
      OR: [{ amazonTrackingId: null }, { amazonTrackingId: "" }],
    },
  });

  const adminsMissingUkTag = await prisma.adminUser.count({
    where: {
      isActive: true,
      canManageProducts: true,
      OR: [{ amazonTrackingIdUk: null }, { amazonTrackingIdUk: "" }],
    },
  });

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
    select: {
      autoPublish: true,
      cronLastRunAt: true,
      cronLastOk: true,
      cronLastSummary: true,
    },
  });

  const cronAgeMs = settings?.cronLastRunAt
    ? Date.now() - settings.cronLastRunAt.getTime()
    : null;
  const cronFresh =
    cronAgeMs !== null && cronAgeMs < 36 * 60 * 60 * 1000 && settings?.cronLastOk;

  const weakPasswordEnv = ["admin123", "change-me", "password", "password123"].includes(
    (process.env.ADMIN_PASSWORD || "").toLowerCase()
  );

  const usTag = superAdmin?.amazonTrackingId?.trim() || "";
  const ukTag = superAdmin?.amazonTrackingIdUk?.trim() || "";

  const items: ReadinessItem[] = [
    {
      id: "secret",
      label: "Auth secret (≥32 chars)",
      ok: secret.length >= 32,
      requiredForLaunch: true,
      detail: secret.length >= 32
        ? "AUTH_SECRET / NEXTAUTH_SECRET looks long enough."
        : "Set a long random AUTH_SECRET and NEXTAUTH_SECRET before production.",
    },
    {
      id: "admin-password-env",
      label: "Admin seed password not default",
      ok: !weakPasswordEnv && Boolean(process.env.ADMIN_PASSWORD?.trim()),
      requiredForLaunch: true,
      detail: weakPasswordEnv
        ? "Change ADMIN_PASSWORD in .env and re-seed or update the Super Admin password in Admins."
        : "ADMIN_PASSWORD env is not a known default.",
      href: "/admin/admins",
    },
    {
      id: "tracking-us",
      label: "Super Admin Tracking ID (US)",
      ok: Boolean(usTag),
      requiredForLaunch: true,
      detail: usTag
        ? `US tag set (${usTag}).`
        : "Set your amazon.com Associates tag under Admins → Edit.",
      href: "/admin/admins",
    },
    {
      id: "tracking-uk",
      label: "Super Admin Tracking ID (UK)",
      ok: Boolean(ukTag),
      requiredForLaunch: false,
      detail: ukTag
        ? `UK tag set (${ukTag}).`
        : "Optional until you post UK deals — add Amazon.co.uk tag under Admins → Edit.",
      href: "/admin/admins",
    },
    {
      id: "staff-tags",
      label: "Product-capable admins have US Tracking IDs",
      ok: adminsMissingTag === 0,
      requiredForLaunch: false,
      detail:
        adminsMissingTag === 0
          ? "All product-capable admins have a US Tracking ID (or none exist yet)."
          : `${adminsMissingTag} product-capable admin(s) missing a US Tracking ID.`,
      href: "/admin/admins",
    },
    {
      id: "staff-tags-uk",
      label: "Product-capable admins have UK Tracking IDs",
      ok: adminsMissingUkTag === 0,
      requiredForLaunch: false,
      detail:
        adminsMissingUkTag === 0
          ? "All product-capable admins have a UK Tracking ID (or none exist yet)."
          : `${adminsMissingUkTag} admin(s) missing UK tag — needed before they post UK deals.`,
      href: "/admin/admins",
    },
    {
      id: "review-mode",
      label: "Auto Publish off (review mode)",
      ok: settings ? settings.autoPublish === false : true,
      requiredForLaunch: false,
      detail: settings?.autoPublish
        ? "Auto Publish is ON — turn off until Gemini output is trusted."
        : "Review mode on — imports wait for your approval (recommended).",
      href: "/admin/settings",
    },
    {
      id: "site-url",
      label: "Public site URL set",
      ok: Boolean(siteUrl) && (isProd ? siteUrl.startsWith("https://") : true),
      requiredForLaunch: true,
      detail: siteUrl
        ? `NEXT_PUBLIC_SITE_URL = ${siteUrl}`
        : "Set NEXT_PUBLIC_SITE_URL to your HTTPS domain before launch.",
    },
    {
      id: "database",
      label: "PostgreSQL DATABASE_URL",
      ok: Boolean(dbUrl) && !dbUrl.startsWith("file:"),
      requiredForLaunch: true,
      detail: dbUrl.startsWith("file:")
        ? "Still on SQLite. Use Docker (`npm run db:up`) or a hosted Postgres URL."
        : dbUrl
          ? "DATABASE_URL points at a non-file database (Postgres expected)."
          : "DATABASE_URL is missing.",
    },
    {
      id: "disclosure",
      label: "Affiliate disclosure page",
      ok: true,
      requiredForLaunch: true,
      detail:
        "Site chrome, deal CTAs, cards, footer, and /disclosure include Amazon Associate wording.",
      href: "/disclosure",
    },
    {
      id: "contact-email",
      label: "Contact email configured",
      ok: Boolean(process.env.CONTACT_EMAIL?.trim()) ||
        Boolean(siteUrl && !siteUrl.includes("localhost")),
      requiredForLaunch: false,
      detail: process.env.CONTACT_EMAIL?.trim()
        ? `CONTACT_EMAIL = ${process.env.CONTACT_EMAIL.trim()}`
        : "Optional: set CONTACT_EMAIL for /contact + privacy (defaults to hello@your-domain).",
      href: "/contact",
    },
    {
      id: "amazon-api",
      label: "Amazon PA-API credentials",
      ok: isAmazonConfigured(),
      requiredForLaunch: false,
      detail: isAmazonConfigured()
        ? "AMAZON_ACCESS_KEY / SECRET_KEY present."
        : "Add when you go live — not required for local UI work.",
    },
    {
      id: "gemini-api",
      label: "Gemini API key",
      ok: isGeminiConfigured(),
      requiredForLaunch: false,
      detail: isGeminiConfigured()
        ? "GEMINI_API_KEY present."
        : "Add when you go live — imports can fall back to Amazon title/description.",
    },
    {
      id: "cron-secret",
      label: "CRON_SECRET set",
      ok: Boolean(process.env.CRON_SECRET?.trim()) &&
        (process.env.CRON_SECRET || "").length >= 16,
      requiredForLaunch: true,
      detail: process.env.CRON_SECRET?.trim()
        ? "CRON_SECRET present — schedule /api/cron/daily daily."
        : "Set CRON_SECRET (≥16 chars) and schedule GET /api/cron/daily.",
    },
    {
      id: "cron-heartbeat",
      label: "Daily cron has run recently",
      ok: Boolean(cronFresh),
      requiredForLaunch: false,
      detail: settings?.cronLastRunAt
        ? cronFresh
          ? `Last cron OK at ${settings.cronLastRunAt.toISOString()}${
              settings.cronLastSummary ? ` (${settings.cronLastSummary})` : ""
            }`
          : `Cron looks stale or failed (last: ${settings.cronLastRunAt.toISOString()}). Re-run windows-cron-daily.ps1 / host scheduler.`
        : "No cron heartbeat yet — schedule GET /api/cron/daily (Bearer CRON_SECRET).",
    },
    {
      id: "sentry",
      label: "Error reporting (optional)",
      ok: Boolean(process.env.SENTRY_DSN?.trim()),
      requiredForLaunch: false,
      detail: process.env.SENTRY_DSN?.trim()
        ? "SENTRY_DSN configured."
        : "Optional: set SENTRY_DSN to capture auto-post / server errors.",
    },
  ];

  const readyExceptApis = items
    .filter((i) => i.requiredForLaunch)
    .every((i) => i.ok);

  const apisReady = isAmazonConfigured() && isGeminiConfigured();

  /** Hide on dashboard only when every checklist item (incl. optional) is OK. */
  const dashboardComplete = items.every((i) => i.ok);

  return { items, readyExceptApis, apisReady, dashboardComplete };
}

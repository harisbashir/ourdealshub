import { prisma } from "@/lib/prisma";
import { openSecret } from "@/lib/secret-box";

export type SocialPlatform =
  | "facebook"
  | "threads"
  | "instagram"
  | "telegram"
  | "pinterest"
  | "x";

/** Platforms shown in Automation + eligible for credential storage. */
export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "facebook",
  "threads",
  "telegram",
];

/** Platforms with implemented auto-post in social-publish.ts */
export const LIVE_SOCIAL_PLATFORMS: SocialPlatform[] = [
  "facebook",
  "threads",
  "telegram",
];

export type PublicSocialConnection = {
  platform: SocialPlatform;
  /** Has saved credentials (even if disabled) */
  configured: boolean;
  /** Configured AND enabled for auto-post */
  connected: boolean;
  pageId: string | null;
  pageName: string | null;
  connectedAt: string | null;
  lastError: string | null;
  /** Masked token preview only */
  tokenHint: string | null;
  tokenExpiresAt: string | null;
  /** True when expiry within 7 days */
  expiresSoon: boolean;
  lastPostAt: string | null;
};

function maskToken(token: string): string {
  if (token.length <= 8) return "••••";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getPublicSocialConnection(
  platform: SocialPlatform
): Promise<PublicSocialConnection> {
  const row = await prisma.socialConnection.findUnique({
    where: { platform },
  });
  if (!row) {
    return {
      platform,
      configured: false,
      connected: false,
      pageId: null,
      pageName: null,
      connectedAt: null,
      lastError: null,
      tokenHint: null,
      tokenExpiresAt: null,
      expiresSoon: false,
      lastPostAt: null,
    };
  }
  const expiresSoon = Boolean(
    row.tokenExpiresAt &&
      row.tokenExpiresAt.getTime() - Date.now() < WEEK_MS &&
      row.tokenExpiresAt.getTime() > Date.now()
  );
  return {
    platform,
    configured: true,
    connected: row.isActive,
    pageId: row.pageId,
    pageName: row.pageName || null,
    connectedAt: row.connectedAt.toISOString(),
    lastError: row.lastError,
    tokenHint: (() => {
      try {
        return maskToken(openSecret(row.accessToken));
      } catch {
        return "••••";
      }
    })(),
    tokenExpiresAt: row.tokenExpiresAt?.toISOString() || null,
    expiresSoon,
    lastPostAt: row.lastPostAt?.toISOString() || null,
  };
}

/** Default Meta long-lived token window (~60 days). */
export function defaultTokenExpiry(days = 60): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** Verify Facebook Page token via Graph API. */
export async function verifyFacebookPage(opts: {
  pageId: string;
  accessToken: string;
}): Promise<{ ok: true; pageName: string } | { ok: false; error: string }> {
  const pageId = opts.pageId.trim();
  const accessToken = opts.accessToken.trim();
  if (!pageId || !accessToken) {
    return { ok: false, error: "Page ID and access token are required." };
  }

  try {
    const url = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}`);
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    const data = (await res.json()) as {
      id?: string;
      name?: string;
      error?: { message?: string };
    };

    if (!res.ok || data.error) {
      return {
        ok: false,
        error:
          data.error?.message ||
          `Facebook rejected the credentials (HTTP ${res.status}).`,
      };
    }

    return { ok: true, pageName: data.name || pageId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not reach Facebook Graph API.",
    };
  }
}

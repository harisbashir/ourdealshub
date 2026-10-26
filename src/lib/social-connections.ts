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
  "instagram",
  "pinterest",
];

/** Platforms with implemented auto-post in social-publish.ts */
export const LIVE_SOCIAL_PLATFORMS: SocialPlatform[] = [
  "facebook",
  "threads",
  "telegram",
  "instagram",
  "pinterest",
];

export type PublicSocialConnection = {
  platform: SocialPlatform;
  /** Has saved credentials (even if disabled) */
  configured: boolean;
  expired: boolean;
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
      expired: false,
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
    expired: Boolean(row.tokenExpiresAt && row.tokenExpiresAt.getTime() <= Date.now()),
    connected: row.isActive && (!row.tokenExpiresAt || row.tokenExpiresAt.getTime() > Date.now()),
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

    // Token in a header, not the query string (keeps it out of URLs / logs)
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
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

/** Check a Threads user token; returns the account's username. */
export async function verifyThreadsAccount(opts: {
  userId: string;
  accessToken: string;
}): Promise<{ ok: true; pageName: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://graph.threads.net/v1.0/me?fields=id,username", {
      headers: { Authorization: `Bearer ${opts.accessToken}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      username?: string;
      error?: { message?: string };
    };
    if (!res.ok || !data.id) {
      return { ok: false, error: data.error?.message || `Threads rejected the token (HTTP ${res.status}).` };
    }
    if (opts.userId && data.id !== opts.userId) {
      return { ok: false, error: `That token belongs to Threads user ${data.id}, not ${opts.userId}.` };
    }
    return { ok: true, pageName: data.username ? `@${data.username}` : data.id };
  } catch {
    return { ok: false, error: "Could not reach Threads." };
  }
}

/** Check a Telegram bot token and that the bot can see the chat. */
export async function verifyTelegramBot(opts: {
  chatId: string;
  token: string;
}): Promise<{ ok: true; pageName: string } | { ok: false; error: string }> {
  try {
    const base = `https://api.telegram.org/bot${opts.token}`;
    const me = (await (await fetch(`${base}/getMe`, { cache: "no-store" })).json()) as {
      ok?: boolean;
      result?: { username?: string };
    };
    if (!me.ok) return { ok: false, error: "Telegram rejected the bot token." };
    const chat = (await (
      await fetch(`${base}/getChat?chat_id=${encodeURIComponent(opts.chatId)}`, { cache: "no-store" })
    ).json()) as { ok?: boolean; result?: { title?: string; username?: string }; description?: string };
    if (!chat.ok) {
      return {
        ok: false,
        error: `The bot can't see chat ${opts.chatId}: ${chat.description || "add the bot to the channel as an admin"}.`,
      };
    }
    return { ok: true, pageName: chat.result?.title || chat.result?.username || opts.chatId };
  } catch {
    return { ok: false, error: "Could not reach Telegram." };
  }
}

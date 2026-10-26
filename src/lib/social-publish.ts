import { recordSystemEvent } from "@/lib/system-events";
import { publicProductWhere } from "@/lib/product-query";
import { LIVE_SOCIAL_PLATFORMS } from "@/lib/social-connections";
import { publishInstagram, publishPinterest, socialOriginError, SocialApiError } from "@/lib/social-api";
import { prisma } from "@/lib/prisma";
import { buildPlatformPost } from "@/lib/social-posting-styles";
import {
  buildTrackedGoUrl,
  campaignForPlatform,
} from "@/lib/campaign";
import type { SocialPlatform } from "@/lib/social-connections";
import {
  isOverDailyCap,
  sleep,
  SOCIAL_POST_GAP_MS,
} from "@/lib/social-rate-limit";
import { reportError } from "@/lib/error-report";
import { openSecret } from "@/lib/secret-box";

export type AutoPostResult = {
  platform: string;
  ok: boolean;
  skipped?: boolean;
  externalId?: string;
  error?: string;
};

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function loadDeal(productId: string) {
  return prisma.product.findFirst({
    where: publicProductWhere({ id: productId, isDemo: false }),
    select: {
      id: true,
      title: true,
      slug: true,
      dealPost: true,
      description: true,
      affiliateUrl: true,
      imageUrl: true,
      marketplace: true,
      category: { select: { name: true } },
    },
  });
}

/**
 * Link post: Facebook builds the preview from the link itself. We don't
 * upload Amazon's product photo — that would copy (cache) an Amazon image on
 * Facebook's servers, which the Associates license doesn't allow (IP §2(h)).
 */
async function postFacebook(opts: {
  pageId: string;
  token: string;
  message: string;
  link: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string; uncertain?: boolean }> {
  try {
    const url = new URL(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(opts.pageId)}/feed`
    );
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: opts.message,
        link: opts.link,
        access_token: opts.token,
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const data = (await res.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!res.ok || data.error) {
      return {
        ok: false,
        error: data.error?.message || `Facebook HTTP ${res.status}`,
        uncertain: res.status >= 500,
      };
    }
    return { ok: true, id: data.id || "" };
  } catch {
    return {
      ok: false,
      error: "Facebook did not confirm the post. Check the Page before retrying.", uncertain: true,
    };
  }
}

async function postThreads(opts: {
  userId: string;
  token: string;
  text: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string; uncertain?: boolean }> {
  try {
    // Params go in a form body, not the query string, so the access token
    // never appears in URLs / proxy logs and long text can't hit URL limits.
    const createRes = await fetch(
      `https://graph.threads.net/v1.0/${encodeURIComponent(opts.userId)}/threads`,
      {
        method: "POST",
        body: new URLSearchParams({
          media_type: "TEXT",
          text: opts.text,
          access_token: opts.token,
        }),
        signal: AbortSignal.timeout(15_000),
      cache: "no-store",
      }
    );
    const created = (await createRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!createRes.ok || !created.id) {
      return {
        ok: false,
        error: created.error?.message || `Threads create HTTP ${createRes.status}`,
      };
    }

    const pubRes = await fetch(
      `https://graph.threads.net/v1.0/${encodeURIComponent(opts.userId)}/threads_publish`,
      {
        method: "POST",
        body: new URLSearchParams({
          creation_id: created.id,
          access_token: opts.token,
        }),
        signal: AbortSignal.timeout(15_000),
      cache: "no-store",
      }
    );
    const published = (await pubRes.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!pubRes.ok || published.error) {
      return {
        ok: false,
        error:
          published.error?.message || `Threads publish HTTP ${pubRes.status}`,
        uncertain: pubRes.status >= 500,
      };
    }
    return { ok: true, id: published.id || created.id };
  } catch {
    return {
      ok: false,
      error: "Threads did not confirm the post. Check the account before retrying.", uncertain: true,
    };
  }
}

/** Text message; Telegram shows the link preview (no Amazon image re-upload). */
async function postTelegram(opts: {
  chatId: string;
  token: string;
  text: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string; uncertain?: boolean }> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${opts.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: opts.chatId,
          text: opts.text,
          disable_web_page_preview: false,
        }),
        signal: AbortSignal.timeout(15_000),
      cache: "no-store",
      }
    );
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `Telegram HTTP ${res.status}`, uncertain: res.status >= 500 };
    }
    return { ok: true, id: String(data.result?.message_id || "") };
  } catch {
    return {
      ok: false,
      error: "Telegram did not confirm the message. Check the channel before retrying.", uncertain: true,
    };
  }
}

/** Queue each deal/channel once. Publishing happens outside web requests. */
export async function autoPostPublishedDeal(productId: string): Promise<AutoPostResult[]> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (settings?.socialAutoPost === false || !(await loadDeal(productId))) return [];
  const connections = await prisma.socialConnection.findMany({ where: { isActive: true, platform: { in: LIVE_SOCIAL_PLATFORMS } } });
  const results: AutoPostResult[] = [];
  for (const connection of connections) {
    // Preserve success history from before the queue was introduced.
    if (await prisma.socialPostLog.findFirst({ where: { productId, platform: connection.platform, status: "ok" } })) continue;
    await prisma.socialDelivery.upsert({
      where: { productId_platform: { productId, platform: connection.platform } },
      create: { productId, platform: connection.platform }, update: {},
    });
    results.push({ platform: connection.platform, ok: true, skipped: true });
  }
  return results;
}

/** One finite batch. Atomic claims allow overlapping schedules safely. */
export async function processSocialQueue(limit = 10) {
  // A process killed after sending a request cannot safely be retried blindly.
  await prisma.socialDelivery.updateMany({
    where: { status: "processing", updatedAt: { lt: new Date(Date.now() - 30 * 60_000) } },
    data: { status: "uncertain", lastError: "Delivery was interrupted. Check the platform before trying again." },
  });
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (settings?.socialAutoPost === false) return { processed: 0, paused: true };
  const jobs = await prisma.socialDelivery.findMany({ where: { status: "queued" }, orderBy: { createdAt: "asc" }, take: Math.min(30, limit) });
  let processed = 0;
  const deadline = Date.now() + 90_000;
  for (const job of jobs) {
    if (Date.now() >= deadline) break;
    const conn = await prisma.socialConnection.findUnique({ where: { platform: job.platform } });
    const deal = await loadDeal(job.productId);
    if (!conn?.isActive || !deal) {
      await prisma.socialDelivery.updateMany({ where: { id: job.id, status: "queued" }, data: { status: "cancelled", lastError: "Connection paused or deal no longer eligible." } });
      continue;
    }
    const platform = job.platform as SocialPlatform;
    if ((await isOverDailyCap(platform)).over) continue;
    const claimed = await prisma.socialDelivery.updateMany({ where: { id: job.id, status: "queued" }, data: { status: "processing", attempts: { increment: 1 }, lastError: null } });
    if (!claimed.count) continue;
    let outcome: { ok: true; id: string } | { ok: false; error: string; uncertain?: boolean };
    try {
      if (conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() <= Date.now()) throw new Error("Token expired. Reconnect this channel in Automation.");
      const origin = siteUrl();
      if (platform === "instagram" || platform === "pinterest") {
        const error = socialOriginError(origin);
        if (error) throw new Error(error);
      }
      const token = openSecret(conn.accessToken);
      const post = buildPlatformPost(platform, {
        title: deal.title, geminiText: (deal.dealPost || deal.description || deal.title).trim(), affiliateUrl: deal.affiliateUrl,
        dealUrl: `${origin}/deal/${deal.slug}`, goUrl: buildTrackedGoUrl(origin, deal.slug, campaignForPlatform(platform)),
        categoryName: deal.category.name, marketplace: deal.marketplace,
      });
      const imageUrl = `${origin}/api/social-image/${encodeURIComponent(deal.slug)}`;
      if (platform === "facebook") outcome = await postFacebook({ pageId: conn.pageId, token, message: post.caption, link: post.linkAttachment || deal.affiliateUrl });
      else if (platform === "threads") outcome = await postThreads({ userId: conn.pageId, token, text: post.caption });
      else if (platform === "telegram") outcome = await postTelegram({ chatId: conn.pageId, token, text: post.caption });
      else if (platform === "instagram") outcome = { ok: true, id: await publishInstagram({ accountId: conn.pageId, token, caption: post.caption, imageUrl }) };
      else if (platform === "pinterest") outcome = { ok: true, id: await publishPinterest({ boardId: conn.pageId, token, title: post.title || deal.title, description: post.caption, link: post.linkUrl, imageUrl }) };
      else throw new Error("Unsupported social channel.");
      if (outcome.ok && !outcome.id) outcome = { ok: false, error: "The platform did not confirm a post ID. Check it before retrying.", uncertain: true };
    } catch (error) {
      outcome = { ok: false, error: error instanceof Error ? error.message : "Delivery failed.", uncertain: error instanceof SocialApiError && error.uncertain };
    }
    const status = outcome.ok ? "published" : outcome.uncertain ? "uncertain" : "failed";
    await prisma.socialDelivery.update({ where: { id: job.id }, data: { status, externalId: outcome.ok ? outcome.id : null, lastError: outcome.ok ? null : outcome.error } });
    await prisma.socialPostLog.create({ data: { productId: job.productId, platform, status: outcome.ok ? "ok" : status === "uncertain" ? "uncertain" : "error", externalId: outcome.ok ? outcome.id : null, error: outcome.ok ? null : outcome.error } });
    await prisma.socialConnection.update({ where: { platform }, data: { lastError: outcome.ok ? null : outcome.error, ...(outcome.ok ? { lastPostAt: new Date() } : {}) } });
    await recordSystemEvent({ category: "social", title: outcome.ok ? `${platform} post published` : `${platform} delivery needs attention`, level: outcome.ok ? "info" : "error", detail: outcome.ok ? "The platform confirmed the post." : "Review the delivery result in Automation. Uncertain results are never retried automatically.", adminPath: "/admin/automation" });
    if (!outcome.ok) await reportError(outcome.error, { platform, productId: job.productId, source: "socialQueue" });
    processed++;
    if (processed < jobs.length) await sleep(SOCIAL_POST_GAP_MS);
  }
  return { processed, paused: false };
}

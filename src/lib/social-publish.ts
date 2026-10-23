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
    where: { id: productId, deletedAt: null, isPublished: true },
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

/** Prefer photo+caption (image URL) then fall back to link post. */
async function postFacebook(opts: {
  pageId: string;
  token: string;
  message: string;
  link: string;
  imageUrl?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    if (opts.imageUrl && /^https?:\/\//i.test(opts.imageUrl)) {
      const photoUrl = new URL(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(opts.pageId)}/photos`
      );
      const caption = `${opts.message}\n\n${opts.link}`.slice(0, 2000);
      const photoRes = await fetch(photoUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: opts.imageUrl,
          caption,
          access_token: opts.token,
        }),
        cache: "no-store",
      });
      const photoData = (await photoRes.json()) as {
        id?: string;
        post_id?: string;
        error?: { message?: string };
      };
      if (photoRes.ok && !photoData.error && (photoData.id || photoData.post_id)) {
        return { ok: true, id: photoData.post_id || photoData.id || "" };
      }
      // fall through to link post if photo rejected
    }

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
      };
    }
    return { ok: true, id: data.id || "" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Facebook request failed",
    };
  }
}

async function postThreads(opts: {
  userId: string;
  token: string;
  text: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
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
      };
    }
    return { ok: true, id: published.id || created.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Threads request failed",
    };
  }
}

async function postTelegram(opts: {
  chatId: string;
  token: string;
  text: string;
  imageUrl?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    if (opts.imageUrl && /^https?:\/\//i.test(opts.imageUrl)) {
      const photoRes = await fetch(
        `https://api.telegram.org/bot${opts.token}/sendPhoto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: opts.chatId,
            photo: opts.imageUrl,
            caption: opts.text.slice(0, 1024),
          }),
          cache: "no-store",
        }
      );
      const photoData = (await photoRes.json()) as {
        ok?: boolean;
        result?: { message_id?: number };
        description?: string;
      };
      if (photoRes.ok && photoData.ok) {
        return { ok: true, id: String(photoData.result?.message_id || "") };
      }
      // fall through to text
    }

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
        cache: "no-store",
      }
    );
    const data = (await res.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `Telegram HTTP ${res.status}` };
    }
    return { ok: true, id: String(data.result?.message_id || "") };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Telegram request failed",
    };
  }
}

/**
 * After a deal becomes published, push to connected channels (FB / Threads / Telegram).
 * Failures are logged — never throw to the publish UI path.
 */
export async function autoPostPublishedDeal(
  productId: string
): Promise<AutoPostResult[]> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  });
  if (settings && settings.socialAutoPost === false) {
    return [];
  }

  const deal = await loadDeal(productId);
  if (!deal) return [];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.socialPostLog.findMany({
    where: {
      productId,
      status: "ok",
      createdAt: { gte: since },
    },
    select: { platform: true },
  });
  const already = new Set(recent.map((r) => r.platform));

  const connections = await prisma.socialConnection.findMany({
    where: {
      isActive: true,
      platform: { in: ["facebook", "threads", "telegram"] },
    },
  });

  const results: AutoPostResult[] = [];
  const origin = siteUrl();
  let postedInBatch = 0;

  for (const conn of connections) {
    if (already.has(conn.platform)) continue;

    const platform = conn.platform as SocialPlatform;

    // Skip expired tokens
    if (conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() < Date.now()) {
      const err = "Access token expired — reconnect in Automation.";
      await prisma.socialConnection.update({
        where: { platform: conn.platform },
        data: { lastError: err, isActive: false },
      });
      await prisma.socialPostLog.create({
        data: {
          productId,
          platform,
          status: "error",
          error: err,
        },
      });
      results.push({ platform, ok: false, error: err });
      continue;
    }

    const cap = await isOverDailyCap(platform);
    if (cap.over) {
      const err = `Daily cap reached (${cap.count}/${cap.cap}) — try tomorrow.`;
      await prisma.socialPostLog.create({
        data: {
          productId,
          platform,
          status: "error",
          error: err,
        },
      });
      results.push({ platform, ok: false, skipped: true, error: err });
      continue;
    }

    if (postedInBatch > 0) {
      await sleep(SOCIAL_POST_GAP_MS);
    }

    const campaign = campaignForPlatform(platform);
    const goUrl = buildTrackedGoUrl(origin, deal.slug, campaign);
    const dealPageUrl = `${origin}/deal/${deal.slug}`;
    // Amazon Special Link for platforms that allow affiliate URLs.
    // Site URLs (deal/go) are for Instagram-style channels where Amazon links break.
    const amazonSpecialLink = deal.affiliateUrl;
    const post = buildPlatformPost(platform, {
      title: deal.title,
      geminiText: (deal.dealPost || deal.description || deal.title).trim(),
      affiliateUrl: amazonSpecialLink,
      dealUrl: dealPageUrl,
      goUrl,
      categoryName: deal.category.name,
      marketplace: deal.marketplace,
    });

    let outcome: { ok: true; id: string } | { ok: false; error: string };

    if (platform === "facebook") {
      outcome = await postFacebook({
        pageId: conn.pageId,
        token: openSecret(conn.accessToken),
        message: post.caption,
        // Graph `link` must be the Special Link — do not cloak behind /go
        link: post.linkAttachment || amazonSpecialLink,
        imageUrl: deal.imageUrl,
      });
    } else if (platform === "threads") {
      outcome = await postThreads({
        userId: conn.pageId,
        token: openSecret(conn.accessToken),
        text: post.caption,
      });
    } else if (platform === "telegram") {
      outcome = await postTelegram({
        chatId: conn.pageId,
        token: openSecret(conn.accessToken),
        text: post.caption,
        imageUrl: deal.imageUrl,
      });
    } else {
      continue;
    }

    postedInBatch++;

    await prisma.socialPostLog.create({
      data: {
        productId,
        platform,
        status: outcome.ok ? "ok" : "error",
        externalId: outcome.ok ? outcome.id : null,
        error: outcome.ok ? null : outcome.error,
      },
    });

    if (!outcome.ok) {
      await prisma.socialConnection.update({
        where: { platform: conn.platform },
        data: { lastError: outcome.error },
      });
      await reportError(outcome.error, {
        platform,
        productId,
        source: "autoPostPublishedDeal",
      });
    } else {
      await prisma.socialConnection.update({
        where: { platform: conn.platform },
        data: { lastError: null, lastPostAt: new Date() },
      });
    }

    results.push({
      platform,
      ok: outcome.ok,
      externalId: outcome.ok ? outcome.id : undefined,
      error: outcome.ok ? undefined : outcome.error,
    });
  }

  return results;
}

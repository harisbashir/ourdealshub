import { prisma } from "@/lib/prisma";
import { isSafeAffiliateRedirectUrl } from "@/lib/affiliate-url";

export type LinkCheckResult = {
  id: string;
  title: string;
  status: "ok" | "broken" | "unknown";
  detail: string;
};

/**
 * HEAD/GET probe Amazon affiliate URL. Soft check — Amazon may block bots.
 */
export async function checkAffiliateLink(
  url: string
): Promise<{ status: "ok" | "broken" | "unknown"; detail: string }> {
  if (!isSafeAffiliateRedirectUrl(url)) {
    return { status: "broken", detail: "Not a safe Amazon URL" };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent":
          "OurDealsHubLinkCheck/1.0 (+https://OurDealsHub.com; admin tool)",
      },
    });
    clearTimeout(timer);

    // Follow one hop only if Location is still Amazon
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc && isSafeAffiliateRedirectUrl(loc)) {
        const hop = await fetch(loc, {
          method: "HEAD",
          redirect: "manual",
          cache: "no-store",
          headers: {
            "User-Agent":
              "OurDealsHubLinkCheck/1.0 (+https://OurDealsHub.com; admin tool)",
          },
        });
        if (hop.status >= 200 && hop.status < 400) {
          return { status: "ok", detail: `HTTP ${hop.status}` };
        }
        if (hop.status === 404 || hop.status === 410) {
          return { status: "broken", detail: `HTTP ${hop.status}` };
        }
        return { status: "unknown", detail: `HTTP ${hop.status}` };
      }
      return { status: "unknown", detail: `HTTP ${res.status}` };
    }

    // Some CDNs reject HEAD — retry GET lightly (no auto-follow)
    if (res.status === 405 || res.status === 403) {
      const getRes = await fetch(url, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: {
          "User-Agent":
            "OurDealsHubLinkCheck/1.0 (+https://OurDealsHub.com; admin tool)",
          Range: "bytes=0-0",
        },
      });
      if (getRes.status >= 200 && getRes.status < 400) {
        return { status: "ok", detail: `HTTP ${getRes.status}` };
      }
      if (getRes.status === 404 || getRes.status === 410) {
        return { status: "broken", detail: `HTTP ${getRes.status}` };
      }
      return { status: "unknown", detail: `HTTP ${getRes.status}` };
    }

    if (res.status >= 200 && res.status < 400) {
      return { status: "ok", detail: `HTTP ${res.status}` };
    }
    if (res.status === 404 || res.status === 410) {
      return { status: "broken", detail: `HTTP ${res.status}` };
    }
    return { status: "unknown", detail: `HTTP ${res.status}` };
  } catch (e) {
    return {
      status: "unknown",
      detail: e instanceof Error ? e.message : "Request failed",
    };
  }
}

export async function checkProductLinks(
  limit = 25,
  opts?: { ownerAdminId?: string }
): Promise<LinkCheckResult[]> {
  const ownerId = opts?.ownerAdminId?.trim() || null;
  const products = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isPublished: true,
      ...(ownerId ? { createdById: ownerId } : {}),
    },
    orderBy: [{ linkCheckedAt: "asc" }, { updatedAt: "desc" }],
    take: Math.min(50, Math.max(1, limit)),
    select: { id: true, title: true, affiliateUrl: true },
  });

  const out: LinkCheckResult[] = [];
  for (const p of products) {
    const result = await checkAffiliateLink(p.affiliateUrl);
    // Confirmed broken (404/410 / unsafe URL) → take offline so visitors
    // are not sent to dead Special Links. "unknown" stays published.
    await prisma.product.update({
      where: { id: p.id },
      data: {
        linkStatus: result.status,
        linkCheckedAt: new Date(),
        ...(result.status === "broken"
          ? { isPublished: false, scheduledAt: null }
          : {}),
      },
    });
    out.push({
      id: p.id,
      title: p.title,
      status: result.status,
      detail:
        result.status === "broken"
          ? `${result.detail} (unpublished)`
          : result.detail,
    });
  }
  return out;
}

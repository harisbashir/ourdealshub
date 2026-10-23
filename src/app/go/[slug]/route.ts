import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/product-query";
import { isSafeAffiliateRedirectUrl } from "@/lib/affiliate-url";
import { maybePruneOldClickEvents } from "@/lib/click-retention";
import {
  sanitizeClickReferer,
  sanitizeUserAgent,
  shouldRecordClick,
} from "@/lib/click-security";
import { normalizeCampaign } from "@/lib/campaign";

type Props = { params: Promise<{ slug: string }> };

function siteOriginFrom(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

/**
 * Affiliate click redirect — only to stored Amazon affiliate URLs (no open redirect).
 * Optional ?src= / ?campaign= for channel attribution.
 */
export async function GET(req: Request, { params }: Props) {
  const { slug } = await params;

  if (!slug || slug.length > 200 || /[\/\\]/.test(slug)) {
    return redirectHome(req);
  }

  const product = await prisma.product.findFirst({
    where: publicProductWhere({ slug }),
    select: { id: true, affiliateUrl: true },
  });

  if (!product) {
    return redirectHome(req);
  }

  if (!isSafeAffiliateRedirectUrl(product.affiliateUrl)) {
    console.error(
      `[go] blocked unsafe affiliateUrl for product ${product.id}`
    );
    return redirectHome(req);
  }

  const reqUrl = new URL(req.url);
  const campaign = normalizeCampaign(
    reqUrl.searchParams.get("src") || reqUrl.searchParams.get("campaign")
  );

  const { record } = shouldRecordClick(req, product.id);
  const userAgent = sanitizeUserAgent(req.headers.get("user-agent"));
  const referer = sanitizeClickReferer(
    req.headers.get("referer"),
    siteOriginFrom(req)
  );
  const productId = product.id;
  const target = product.affiliateUrl;

  if (record) {
    after(async () => {
      try {
        await prisma.$transaction([
          prisma.clickEvent.create({
            data: { productId, userAgent, referer, campaign },
          }),
          prisma.product.update({
            where: { id: productId },
            data: { clickCount: { increment: 1 } },
          }),
        ]);
        await maybePruneOldClickEvents();
      } catch {
        /* analytics must not break redirects */
      }
    });
  }

  const res = NextResponse.redirect(target, 302);
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

function redirectHome(req: Request) {
  // Behind a reverse proxy req.url is the internal address (e.g. 0.0.0.0:3000),
  // so redirect to the configured public origin instead.
  const res = NextResponse.redirect(`${siteOriginFrom(req)}/`, 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

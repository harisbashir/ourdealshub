import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAdmin } from "@/lib/admin-auth";
import { canAccessProducts } from "@/lib/permissions";
import { isAmazonConfigured, lookupAmazonProduct } from "@/lib/amazon";
import { clientIp } from "@/lib/rate-limit";
import { rateLimitDurable } from "@/lib/rate-limit-durable";
import {
  getAdminTrackingId,
  missingTrackingIdMessage,
} from "@/lib/admin-tracking";
import {
  detectMarketplaceFromInput,
  parseMarketplace,
} from "@/lib/marketplace";

const bodySchema = z.object({
  query: z.string().min(3).max(500),
  /** US | UK — ignored when the URL itself names a marketplace */
  marketplace: z.string().max(4).optional(),
});

export async function POST(req: Request) {
  try {
    const admin = await getSessionAdmin();
    if (!admin || !canAccessProducts(admin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await rateLimitDurable(
      `amazon:${admin.id}:${clientIp(req)}`,
      20,
      60 * 60_000
    );
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Amazon lookup rate limit reached. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        }
      );
    }


    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide an Amazon product URL or ASIN." },
        { status: 400 }
      );
    }

    const marketplace =
      detectMarketplaceFromInput(parsed.data.query) ||
      parseMarketplace(parsed.data.marketplace);

    if (!(await isAmazonConfigured(marketplace))) {
      return NextResponse.json(
        {
          error: `Amazon Creators API isn't configured for ${marketplace}. Add credentials in Admin → Settings → API keys.`,
        },
        { status: 503 }
      );
    }

    // Partner tag always from DB — never from request body
    const trackingId = await getAdminTrackingId(admin.id, marketplace);
    if (!trackingId) {
      return NextResponse.json(
        {
          error:
            missingTrackingIdMessage(marketplace),
        },
        { status: 403 }
      );
    }

    const product = await lookupAmazonProduct(
      parsed.data.query,
      trackingId,
      marketplace
    );
    return NextResponse.json({ product });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Amazon lookup failed.";
    const safe = message
      .replace(/AKIA[0-9A-Z]{16}/g, "[redacted]")
      .replace(/Secret=?[^\s]+/gi, "[redacted]");
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin || !canAccessProducts(admin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const trackingId = await getAdminTrackingId(admin.id);
  return NextResponse.json({
    configured: await isAmazonConfigured(),
    hasTrackingId: Boolean(trackingId),
  });
}

import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  formatDigestMessage,
  getOpsInsights,
} from "@/lib/ops-insights";
import { autoPostPublishedDeal } from "@/lib/social-publish";
import { pruneOldClickEvents } from "@/lib/click-retention";
import { openSecret } from "@/lib/secret-box";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;

  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return false;
  const bearer = header.slice(7).trim();
  if (!bearer) return false;

  try {
    const a = Buffer.from(bearer);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Cron endpoint — Authorization: Bearer $CRON_SECRET only (no ?secret=).
 * 1) Publish due scheduled drafts
 * 2) Send Telegram digest if connected
 */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isPublished: false,
      scheduledAt: { lte: now },
    },
    take: 30,
    select: { id: true },
  });

  let publishedCount = 0;
  for (const p of due) {
    await prisma.product.update({
      where: { id: p.id },
      data: { isPublished: true, scheduledAt: null },
    });
    publishedCount += 1;
    try {
      await autoPostPublishedDeal(p.id);
    } catch {
      /* continue */
    }
  }

  // Re-check affiliate links (flag broken for digest + admin list)
  let linksChecked = 0;
  let linksBroken = 0;
  try {
    const { checkProductLinks } = await import("@/lib/link-check");
    const results = await checkProductLinks(20);
    linksChecked = results.length;
    linksBroken = results.filter((r) => r.status === "broken").length;
  } catch {
    /* non-fatal */
  }

  const insights = await getOpsInsights(7);
  const message = formatDigestMessage(insights);

  let telegramOk = false;
  const tg = await prisma.socialConnection.findUnique({
    where: { platform: "telegram" },
  });
  if (tg?.isActive && tg.accessToken && tg.pageId) {
    try {
      const token = openSecret(tg.accessToken);
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tg.pageId,
            text: message,
          }),
          cache: "no-store",
        }
      );
      const data = (await res.json()) as { ok?: boolean };
      telegramOk = Boolean(data.ok);
    } catch {
      telegramOk = false;
    }
  }

  const clicksPruned = await pruneOldClickEvents();

  const summary = `published=${publishedCount}; linksChecked=${linksChecked}; linksBroken=${linksBroken}; telegramOk=${telegramOk}; clicksPruned=${clicksPruned}`;

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      cronLastRunAt: new Date(),
      cronLastOk: true,
      cronLastSummary: summary.slice(0, 500),
    },
    update: {
      cronLastRunAt: new Date(),
      cronLastOk: true,
      cronLastSummary: summary.slice(0, 500),
    },
  });

  return NextResponse.json({
    ok: true,
    publishedCount,
    telegramOk,
    clicksPruned,
    linksChecked,
    linksBroken,
  });
}

import { socialOriginError } from "@/lib/social-api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/product-query";
import {
  getPublicSocialConnection,
  SOCIAL_PLATFORMS,
  type PublicSocialConnection,
  type SocialPlatform,
} from "@/lib/social-connections";
import {
  AutomationWorkspace,
  type PostActivityRow,
  type ShareDeal,
} from "@/components/admin/AutomationWorkspace";

export const metadata = { title: "Automation — Admin" };

export default async function AutomationPage() {
  await requireSuperAdmin();

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  const [connectionList, logs, recentDeal, queue] = await Promise.all([
    Promise.all(SOCIAL_PLATFORMS.map((p) => getPublicSocialConnection(p))),
    prisma.socialPostLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        product: { select: { id: true, title: true } },
      },
    }),
    prisma.product.findFirst({
      where: publicProductWhere(),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        dealPost: true,
        description: true,
        affiliateUrl: true,
        marketplace: true,
        isDemo: true,
        category: { select: { name: true } },
      },
    }),
    prisma.socialDelivery.findMany({ where: { status: { notIn: ["published", "cancelled"] } }, orderBy: { createdAt: "desc" }, take: 30, include: { product: { select: { title: true } } } }),
  ]);

  const connections = Object.fromEntries(
    SOCIAL_PLATFORMS.map((p, i) => [p, connectionList[i]])
  ) as Record<SocialPlatform, PublicSocialConnection>;

  const activity: PostActivityRow[] = logs.map((l) => ({
    id: l.id,
    productId: l.product.id,
    productTitle: l.product.title,
    platform: l.platform,
    status: l.status,
    externalId: l.externalId,
    error: l.error,
    createdAt: l.createdAt.toISOString(),
  }));

  const previewDeal: ShareDeal | null = recentDeal
    ? {
        id: recentDeal.id,
        marketplace: recentDeal.marketplace,
        isDemo: recentDeal.isDemo,
        title: recentDeal.title,
        slug: recentDeal.slug,
        categoryName: recentDeal.category.name,
        geminiText: (
          recentDeal.dealPost ||
          recentDeal.description ||
          recentDeal.title
        ).trim(),
        affiliateUrl: recentDeal.affiliateUrl,
        dealUrl: `${siteUrl}/deal/${recentDeal.slug}`,
        goUrl: `${siteUrl}/go/${recentDeal.slug}`,
      }
    : null;

  return (
    <div className="max-w-5xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          Distribution
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Social Automation
        </h1>
        <p className="mt-1 text-sm text-muted-fg max-w-2xl">
          New deals are queued for connected channels. Draft, sample, expired,
          and archived deals are never posted. Connect Facebook, Threads, Telegram,
          Instagram or Pinterest. Each channel has a daily limit and a visible delivery history.
        </p>
      </header>

      <AutomationWorkspace
        publishingNotice={socialOriginError(siteUrl)}
        queue={queue.map((job) => ({ id: job.id, title: job.product.title, platform: job.platform, status: job.status, lastError: job.lastError }))}
        connections={connections}
        activity={activity}
        previewDeal={previewDeal}
      />
    </div>
  );
}

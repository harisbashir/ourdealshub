"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin-auth";
import {
  defaultTokenExpiry,
  verifyFacebookPage,
  verifyTelegramBot,
  verifyThreadsAccount,
  type SocialPlatform,
} from "@/lib/social-connections";
import { sealSecret } from "@/lib/secret-box";

export type ConnectResult =
  | { ok: true; pageName: string }
  | { ok: false; error: string };

function expiryForPlatform(platform: SocialPlatform): Date | null {
  // Telegram bot tokens don't expire; Meta-ish tokens ~60d
  if (platform === "telegram") return null;
  return defaultTokenExpiry(60);
}

export async function connectFacebookPage(formData: FormData): Promise<ConnectResult> {
  await requireSuperAdmin();

  const pageId = String(formData.get("pageId") || "").trim();
  const accessToken = String(formData.get("accessToken") || "").trim();

  const verified = await verifyFacebookPage({ pageId, accessToken });
  if (!verified.ok) return verified;

  const tokenExpiresAt = expiryForPlatform("facebook");

  const sealed = sealSecret(accessToken);

  await prisma.socialConnection.upsert({
    where: { platform: "facebook" },
    create: {
      platform: "facebook",
      pageId,
      pageName: verified.pageName,
      accessToken: sealed,
      isActive: true,
      lastError: null,
      connectedAt: new Date(),
      tokenExpiresAt,
    },
    update: {
      pageId,
      pageName: verified.pageName,
      accessToken: sealed,
      isActive: true,
      lastError: null,
      connectedAt: new Date(),
      tokenExpiresAt,
    },
  });

  revalidatePath("/admin/automation");
  return { ok: true, pageName: verified.pageName };
}

export async function disconnectSocialPlatform(
  platform: SocialPlatform
): Promise<void> {
  await requireSuperAdmin();
  await prisma.socialConnection.deleteMany({ where: { platform } });
  revalidatePath("/admin/automation");
}

/** Soft enable / disable without deleting saved credentials. */
export async function setSocialPlatformActive(
  platform: SocialPlatform,
  active: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireSuperAdmin();
  const row = await prisma.socialConnection.findUnique({ where: { platform } });
  if (!row) {
    return { ok: false, error: "Connect credentials first." };
  }
  await prisma.socialConnection.update({
    where: { platform },
    data: { isActive: active },
  });
  revalidatePath("/admin/automation");
  return { ok: true };
}

/** Re-try auto-post for recent failed (or never-posted) published deals. */
export async function retryFailedSocialPosts(): Promise<{
  ok: true;
  retried: number;
}> {
  await requireSuperAdmin();
  const { autoPostPublishedDeal } = await import("@/lib/social-publish");

  const failed = await prisma.socialPostLog.findMany({
    where: { status: "error" },
    orderBy: { createdAt: "desc" },
    take: 40,
    distinct: ["productId"],
    select: { productId: true },
  });

  let retried = 0;
  for (const row of failed) {
    try {
      await autoPostPublishedDeal(row.productId);
      retried++;
    } catch {
      /* continue */
    }
  }

  // Also post recent published deals that have never been shared anywhere
  // (never re-share deals that already went out successfully)
  if (retried === 0) {
    const neverShared = await prisma.product.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        socialPosts: { none: { status: "ok" } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true },
    });
    for (const p of neverShared) {
      try {
        await autoPostPublishedDeal(p.id);
        retried++;
      } catch {
        /* continue */
      }
    }
  }

  revalidatePath("/admin/automation");
  return { ok: true, retried };
}

/** Threads uses similar Page-linked Meta tokens later — stub save for now. */
export async function connectThreadsAccount(
  formData: FormData
): Promise<ConnectResult> {
  return connectSocialStub(formData, "threads");
}

/** Soft-save credentials for platforms that auto-post (Telegram today). */
export async function connectSocialStub(
  formData: FormData,
  platform: SocialPlatform
): Promise<ConnectResult> {
  await requireSuperAdmin();
  // Only platforms the publisher can actually post to (social-publish.ts)
  if (platform !== "telegram" && platform !== "threads") {
    return {
      ok: false,
      error: `${platform} auto-post is not available yet.`,
    };
  }
  const pageId = String(formData.get("pageId") || "").trim();
  const accessToken = String(formData.get("accessToken") || "").trim();
  if (!pageId || !accessToken) {
    return {
      ok: false,
      error: "Account ID and access token are required.",
    };
  }

  // Verify before saving so a typo shows up now, not on the next publish
  const verified =
    platform === "threads"
      ? await verifyThreadsAccount({ userId: pageId, accessToken })
      : await verifyTelegramBot({ chatId: pageId, token: accessToken });
  if (!verified.ok) return verified;

  const tokenExpiresAt = expiryForPlatform(platform);
  const sealed = sealSecret(accessToken);

  await prisma.socialConnection.upsert({
    where: { platform },
    create: {
      platform,
      pageId,
      pageName: verified.pageName,
      accessToken: sealed,
      isActive: true,
      lastError: null,
      connectedAt: new Date(),
      tokenExpiresAt,
    },
    update: {
      pageId,
      pageName: verified.pageName,
      accessToken: sealed,
      isActive: true,
      lastError: null,
      connectedAt: new Date(),
      tokenExpiresAt,
    },
  });

  revalidatePath("/admin/automation");
  return { ok: true, pageName: verified.pageName };
}

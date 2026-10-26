"use server";
import { createChangeNotifier } from "@/lib/system-events";

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
  const notifyChange = createChangeNotifier("settings", "Facebook Page connected", "/admin/automation");
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

  await notifyChange();
  revalidatePath("/admin/automation");
  return { ok: true, pageName: verified.pageName };
}

export async function disconnectSocialPlatform(
  platform: SocialPlatform
): Promise<void> {
  const notifyChange = createChangeNotifier("settings", "Social connection removed", "/admin/automation");
  await requireSuperAdmin();
  await prisma.socialConnection.deleteMany({ where: { platform } });
  await notifyChange();
  revalidatePath("/admin/automation");
}

/** Soft enable / disable without deleting saved credentials. */
export async function setSocialPlatformActive(
  platform: SocialPlatform,
  active: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const notifyChange = createChangeNotifier("settings", "Social channel publishing preference changed", "/admin/automation");
  await requireSuperAdmin();
  const row = await prisma.socialConnection.findUnique({ where: { platform } });
  if (!row) {
    return { ok: false, error: "Connect credentials first." };
  }
  await prisma.socialConnection.update({
    where: { platform },
    data: { isActive: active },
  });
  await notifyChange();
  revalidatePath("/admin/automation");
  return { ok: true };
}

/** Retry only confirmed failures/cancellations; uncertain writes need review. */
export async function retryFailedSocialPosts(): Promise<{ ok: true; retried: number }> {
  const notifyChange = createChangeNotifier("social", "Social deliveries queued for retry", "/admin/automation");
  await requireSuperAdmin();
  const active = await prisma.socialConnection.findMany({ where: { isActive: true }, select: { platform: true } });
  const jobs = await prisma.socialDelivery.findMany({
    where: { status: { in: ["failed", "cancelled"] }, platform: { in: active.map((c) => c.platform) }, product: { isDemo: false, isPublished: true, deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
    orderBy: { updatedAt: "desc" }, take: 50, select: { id: true },
  });
  const result = await prisma.socialDelivery.updateMany({ where: { id: { in: jobs.map((job) => job.id) }, status: { in: ["failed", "cancelled"] } }, data: { status: "queued", lastError: null } });
  if (result.count) await notifyChange();
  revalidatePath("/admin/automation");
  return { ok: true, retried: result.count };
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
  const notifyChange = createChangeNotifier("settings", "Social account connected", "/admin/automation");
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

  await notifyChange();
  revalidatePath("/admin/automation");
  return { ok: true, pageName: verified.pageName };
}

/** Instagram Login tokens and Pinterest board tokens are verified before save. */
export async function connectImageChannel(formData: FormData, platform: "instagram" | "pinterest"): Promise<ConnectResult> {
  const notifyChange = createChangeNotifier("settings", "Image publishing account connected", "/admin/automation");
  await requireSuperAdmin();
  if (platform !== "instagram" && platform !== "pinterest") return { ok: false, error: "Unsupported channel." };
  const pageId = String(formData.get("pageId") || "").trim();
  const accessToken = String(formData.get("accessToken") || "").trim();
  const expiry = String(formData.get("tokenExpiresAt") || "");
  const tokenExpiresAt = new Date(`${expiry}T00:00:00.000Z`);
  if (!/^\d{1,32}$/.test(pageId) || !accessToken || accessToken.length > 4000 || /\s/.test(accessToken)) return { ok: false, error: "Enter a numeric account/board ID and a valid access token." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || !Number.isFinite(tokenExpiresAt.getTime()) || tokenExpiresAt.getTime() <= Date.now()) return { ok: false, error: "Choose the actual token expiry date shown by your developer dashboard (a future date)." };
  try {
    const { verifyInstagram, verifyPinterest } = await import("@/lib/social-api");
    const pageName = platform === "instagram" ? await verifyInstagram(pageId, accessToken) : await verifyPinterest(pageId, accessToken);
    const data = { pageId, pageName, accessToken: sealSecret(accessToken), isActive: true, lastError: null, connectedAt: new Date(), tokenExpiresAt };
    await prisma.socialConnection.upsert({ where: { platform }, create: { platform, ...data }, update: data });
    await notifyChange();
  revalidatePath("/admin/automation");
    return { ok: true, pageName };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Could not verify this connection." }; }
}

/** Uncertain results require a person to check the external account first. */
export async function resolveSocialDelivery(id: string, resolution: "published" | "retry") {
  const notifyChange = createChangeNotifier("social", "Uncertain social delivery reviewed", "/admin/automation");
  await requireSuperAdmin();
  if (resolution !== "published" && resolution !== "retry") return;
  await prisma.socialDelivery.updateMany({ where: { id, status: "uncertain" }, data: { status: resolution === "published" ? "published" : "queued", lastError: null } });
  await notifyChange();
  revalidatePath("/admin/automation");
}

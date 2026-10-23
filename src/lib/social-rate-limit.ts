import type { SocialPlatform } from "@/lib/social-connections";
import { prisma } from "@/lib/prisma";

/** Soft daily caps — stay well under platform spam thresholds. */
export const SOCIAL_DAILY_CAPS: Partial<Record<SocialPlatform, number>> = {
  facebook: 40,
  threads: 25,
  telegram: 60,
  instagram: 20,
  pinterest: 30,
  x: 40,
};

/** Pause between channel posts in one deal publish (ms). */
export const SOCIAL_POST_GAP_MS = 1500;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** How many successful posts today for this platform. */
export async function countSuccessfulPostsToday(
  platform: string
): Promise<number> {
  return prisma.socialPostLog.count({
    where: {
      platform,
      status: "ok",
      createdAt: { gte: startOfUtcDay() },
    },
  });
}

export async function isOverDailyCap(
  platform: SocialPlatform
): Promise<{ over: boolean; count: number; cap: number }> {
  const cap = SOCIAL_DAILY_CAPS[platform] ?? 30;
  const count = await countSuccessfulPostsToday(platform);
  return { over: count >= cap, count, cap };
}

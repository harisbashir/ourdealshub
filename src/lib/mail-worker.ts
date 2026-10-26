import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { recordSystemEvent, activityEmail } from "@/lib/system-events";
import { mailReady, safeMailError, sendSystemMail } from "@/lib/mail-transport";

export async function checkSystemHealth() {
  try {
    const settings = await prisma.mailSettings.findUnique({ where: { id: "default" } });
    if (!settings?.enabled) return;
    const url = process.env.APP_HEALTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (url) {
      let healthy = false;
      try { healthy = (await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) })).ok; } catch { /* record only a transition */ }
      const previous = await prisma.systemMonitor.findUnique({ where: { key: "website" } });
      if ((!healthy || previous) && previous?.state !== (healthy ? "ok" : "failed")) {
        await recordSystemEvent({ category: "operations", level: healthy ? "info" : "error", title: healthy ? "Website is responding again" : "Website health check failed", detail: healthy ? "The scheduled check reached the website successfully." : "The scheduled check could not reach the website. Review the application service and logs.", adminPath: "/admin/settings#email" });
      }
      await prisma.systemMonitor.upsert({ where: { key: "website" }, create: { key: "website", state: healthy ? "ok" : "failed" }, update: { state: healthy ? "ok" : "failed" } });
    }
    const release = createHash("sha256").update(process.cwd()).digest("hex");
    const previousRelease = await prisma.systemMonitor.findUnique({ where: { key: "application-release" } });
    if (previousRelease && previousRelease.state !== release) {
      await recordSystemEvent({ category: "operations", title: "Application release changed", detail: "The scheduled monitor detected a new application release.", dedupeKey: `release:${release}`, adminPath: "/admin/settings#email" });
    }
    await prisma.systemMonitor.upsert({ where: { key: "application-release" }, create: { key: "application-release", state: release }, update: { state: release } });
    const day = new Date().toISOString().slice(0, 10);
    const site = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    if (!site?.cronLastRunAt || Date.now() - site.cronLastRunAt.getTime() > 36 * 60 * 60_000 || !site.cronLastOk) {
      await recordSystemEvent({ category: "operations", level: "warning", title: "Daily maintenance needs attention", detail: "The daily job has not reported a successful run in the last 36 hours. Check its schedule and logs.", dedupeKey: `daily-stale:${day}`, adminPath: "/admin/settings#go-live" });
    }
    const connections = await prisma.socialConnection.findMany({ where: { isActive: true, tokenExpiresAt: { lte: new Date(Date.now() + 7 * 86400_000) } }, select: { platform: true, tokenExpiresAt: true } });
    for (const connection of connections) {
      await recordSystemEvent({ category: "social", level: "warning", title: `${connection.platform} token expires soon or has expired`, detail: "Reconnect this channel in Automation to keep publishing.", dedupeKey: `token-expiry:${connection.platform}:${day}`, adminPath: "/admin/automation" });
    }
  } catch { console.warn("[mail] Health checks could not run."); }
}

/** Finite, lease-protected batch; no always-running worker is needed. */
export async function processMailQueue(options?: { testId?: string; send?: typeof sendSystemMail; now?: Date }) {
  const now = options?.now || new Date();
  await prisma.mailSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
  const token = randomUUID();
  const claim = await prisma.mailSettings.updateMany({ where: { id: "default", OR: [{ workerLeaseUntil: null }, { workerLeaseUntil: { lt: now } }] }, data: { workerToken: token, workerLeaseUntil: new Date(now.getTime() + 120_000), lastWorkerAt: now } });
  if (!claim.count) return { processed: 0, status: "busy" };
  try {
    // An interrupted SMTP DATA phase may already have delivered a message.
    const interrupted = await prisma.mailDelivery.findMany({ where: { status: "sending", updatedAt: { lt: new Date(now.getTime() - 120_000) } }, select: { id: true }, take: 100 });
    if (interrupted.length) await prisma.$transaction([
      prisma.mailDelivery.updateMany({ where: { id: { in: interrupted.map((row) => row.id) }, status: "sending" }, data: { status: "uncertain", error: "Delivery was interrupted. Check the inbox before retrying." } }),
      prisma.systemEvent.updateMany({ where: { deliveryId: { in: interrupted.map((row) => row.id) }, mailStatus: "sending" }, data: { mailStatus: "uncertain" } }),
    ]);
    const settings = await prisma.mailSettings.findUniqueOrThrow({ where: { id: "default" } });
    if (!mailReady(settings)) return { processed: 0, status: "not-configured" };
    let delivery = options?.testId
      ? await prisma.mailDelivery.findFirst({ where: { id: options.testId, kind: "test", status: "queued" } })
      : await prisma.mailDelivery.findFirst({ where: { status: "queued", ...(settings.enabled ? {} : { kind: "test" }) }, orderBy: [{ kind: "desc" }, { createdAt: "asc" }] });
    if (!delivery && !options?.testId && settings.enabled) {
      const events = await prisma.systemEvent.findMany({ where: { mailStatus: "queued", deliveryId: null }, orderBy: { createdAt: "asc" }, take: 100 });
      const due = events.some((event) => event.level === "error") || (events.length && now.getTime() - events[0].createdAt.getTime() >= settings.digestMinutes * 60_000);
      if (events.length && due) {
        const message = activityEmail(events, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
        delivery = await prisma.$transaction(async (tx) => {
          const created = await tx.mailDelivery.create({ data: { kind: "activity", recipient: settings.recipient, ...message } });
          await tx.systemEvent.updateMany({ where: { id: { in: events.map((event) => event.id) }, mailStatus: "queued", deliveryId: null }, data: { deliveryId: created.id, mailStatus: "sending" } });
          return created;
        });
      }
    }
    if (!delivery) return { processed: 0, status: settings.enabled ? "waiting" : "paused" };
    // Use the currently saved recipient, never a client-supplied test address.
    const started = await prisma.mailDelivery.updateMany({ where: { id: delivery.id, status: "queued" }, data: { status: "sending", recipient: settings.recipient } });
    if (!started.count) return { processed: 0, status: "already-claimed" };
    let status = "sent";
    let error: string | null = null;
    let messageId: string | null = null;
    try { messageId = await (options?.send || sendSystemMail)(settings, { id: delivery.id, subject: delivery.subject, text: delivery.text }); }
    catch (problem) { const safe = safeMailError(problem); status = safe.uncertain ? "uncertain" : "failed"; error = safe.message; }
    await prisma.$transaction([
      prisma.mailDelivery.update({ where: { id: delivery.id }, data: { status, error, messageId, ...(status === "sent" ? { sentAt: new Date() } : {}) } }),
      prisma.systemEvent.updateMany({ where: { deliveryId: delivery.id }, data: { mailStatus: status } }),
    ]);
    if (status === "sent") await prisma.mailSettings.update({ where: { id: "default" }, data: { lastSentAt: new Date() } });
    return { processed: 1, status };
  } finally {
    await prisma.mailSettings.updateMany({ where: { id: "default", workerToken: token }, data: { workerToken: null, workerLeaseUntil: null } });
  }
}

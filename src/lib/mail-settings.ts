import { prisma } from "@/lib/prisma";
import type { MailSettingsView } from "@/components/admin/MailSettingsForm";

/** Explicit browser view: no ciphertext, password, refresh token or device code. */
export async function getMailAdminData() {
  const [row, deliveries, events] = await Promise.all([
    prisma.mailSettings.findUnique({ where: { id: "default" } }),
    prisma.mailDelivery.findMany({ orderBy: { createdAt: "desc" }, take: 15, select: { id: true, subject: true, kind: true, status: true, recipient: true, error: true, createdAt: true } }),
    prisma.systemEvent.findMany({ orderBy: { createdAt: "desc" }, take: 25, select: { id: true, title: true, category: true, level: true, createdAt: true } }),
  ]);
  const initial: MailSettingsView = {
    enabled: row?.enabled || false, provider: row?.provider || "gmail", host: row?.host || "smtp.gmail.com", port: row?.port || 465, secure: row?.secure ?? true,
    username: row?.username || "", fromAddress: row?.fromAddress || "", recipient: row?.recipient || "", oauthClientId: row?.oauthClientId || "",
    hasPassword: Boolean(row?.password), oauthConnected: Boolean(row?.oauthRefreshToken), digestMinutes: row?.digestMinutes || 5,
    notifyContent: row?.notifyContent ?? true, notifySettings: row?.notifySettings ?? true, notifySecurity: row?.notifySecurity ?? true,
    notifySocial: row?.notifySocial ?? true, notifyOperations: row?.notifyOperations ?? true,
    lastSentAt: row?.lastSentAt?.toISOString() || null, lastWorkerAt: row?.lastWorkerAt?.toISOString() || null,
  };
  return { initial, deliveries: deliveries.map((delivery) => ({ ...delivery, createdAt: delivery.createdAt.toISOString() })), events: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })) };
}

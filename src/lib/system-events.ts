import { prisma } from "@/lib/prisma";

export const EVENT_CATEGORIES = ["content", "settings", "security", "social", "operations"] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];
export type EventInput = { category: EventCategory; title: string; detail?: string; level?: "info" | "warning" | "error"; adminPath?: string; dedupeKey?: string };
const PREFERENCES = { content: "notifyContent", settings: "notifySettings", security: "notifySecurity", social: "notifySocial", operations: "notifyOperations" } as const;

/** Best-effort reporting after a successful operation. Never include secret values. */
export async function recordSystemEvent(input: EventInput): Promise<void> {
  try {
    const settings = await prisma.mailSettings.findUnique({ where: { id: "default" } });
    const mailStatus = settings?.enabled && settings[PREFERENCES[input.category]] ? "queued" : "suppressed";
    const data = {
      category: input.category, title: input.title.replace(/[\r\n]/g, " ").slice(0, 180),
      detail: input.detail?.slice(0, 2000), level: input.level || "info",
      adminPath: input.adminPath?.startsWith("/admin") && !/[\r\n?]/.test(input.adminPath) ? input.adminPath : "/admin",
      mailStatus, dedupeKey: input.dedupeKey?.slice(0, 191),
    };
    if (data.dedupeKey) await prisma.systemEvent.upsert({ where: { dedupeKey: data.dedupeKey }, create: data, update: {} });
    else await prisma.systemEvent.create({ data });
  } catch { console.warn("[notifications] Could not record a system event."); }
}

/** One alert per server action, even when several pages are revalidated. */
export function createChangeNotifier(category: EventCategory, title: string, adminPath = "/admin") {
  let recorded = false;
  return async () => {
    if (recorded) return;
    recorded = true;
    await recordSystemEvent({ category, title, adminPath });
  };
}

export function activityEmail(events: { title: string; detail: string | null; level: string; category: string; adminPath: string; createdAt: Date }[], origin: string) {
  const alerts = events.filter((event) => event.level === "error").length;
  const subject = alerts ? `OurDealsHub: ${alerts} system alert${alerts === 1 ? "" : "s"}` : `OurDealsHub: ${events.length} activity update${events.length === 1 ? "" : "s"}`;
  const lines = ["OurDealsHub administrator update", "", "All times below are UTC.", ""];
  for (const event of events) {
    lines.push(`${event.createdAt.toISOString().replace("T", " ").slice(0, 19)} · ${event.category} · ${event.level.toUpperCase()}`, event.title);
    if (event.detail) lines.push(event.detail);
    lines.push(`${origin.replace(/\/$/, "")}${event.adminPath}`, "");
  }
  lines.push("Manage these notifications in Admin → Settings → Email notifications.", "This is a system notification, not a marketing message.");
  return { subject, text: lines.join("\n") };
}

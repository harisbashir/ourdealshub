"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { openSecret, sealSecret } from "@/lib/secret-box";
import { rateLimitDurable } from "@/lib/rate-limit-durable";
import { recordSystemEvent } from "@/lib/system-events";
import { mailReady, MICROSOFT_SCOPES, MICROSOFT_TOKEN_URL } from "@/lib/mail-transport";
import { processMailQueue } from "@/lib/mail-worker";

export type MailActionResult = { ok: boolean; message: string };
const email = z.email().max(254);
function strongSecret() { return (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "").trim().length >= 32; }

export async function saveMailSettings(_previous: MailActionResult | null, form: FormData): Promise<MailActionResult> {
  await requireSuperAdmin();
  if (!strongSecret()) return { ok: false, message: "Configure a long authentication secret before saving mail credentials." };
  const provider = String(form.get("provider"));
  if (!["gmail", "outlook", "custom"].includes(provider)) return { ok: false, message: "Choose Gmail, Outlook or custom SMTP." };
  const username = String(form.get("username") || "").trim();
  const recipient = String(form.get("recipient") || "").trim();
  const fromAddress = provider === "custom" ? String(form.get("fromAddress") || username).trim() : username;
  if (![recipient, fromAddress].every((value) => email.safeParse(value).success) || (provider === "custom" ? !username || username.length > 254 || /[\r\n]/.test(username) : !email.safeParse(username).success)) return { ok: false, message: "Enter valid sender, username and recipient email addresses." };
  const host = provider === "gmail" ? "smtp.gmail.com" : provider === "outlook" ? "smtp-mail.outlook.com" : String(form.get("host") || "").trim().toLowerCase();
  const port = provider === "gmail" ? 465 : provider === "outlook" ? 587 : Number(form.get("port"));
  const secure = provider === "gmail" || (provider === "custom" && form.get("secure") === "tls");
  if (!/^[a-z0-9.-]{1,253}$/i.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, message: "Enter a valid SMTP hostname and port." };
  const oauthClientId = provider === "outlook" ? String(form.get("oauthClientId") || "").trim() : "";
  if (oauthClientId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(oauthClientId)) return { ok: false, message: "Microsoft's application client ID must be a valid UUID." };
  const existing = await prisma.mailSettings.findUnique({ where: { id: "default" } });
  // Never reuse an old account's secret when the server/account changes.
  const sameAccount = existing?.provider === provider && existing.host === host && existing.port === port && existing.secure === secure && existing.username === username;
  const rawPassword = String(form.get("password") || "");
  if (rawPassword.length > 1000 || /[\r\n]/.test(rawPassword)) return { ok: false, message: "The SMTP password is too long or contains a line break." };
  const normalizedPassword = provider === "gmail" ? rawPassword.replace(/\s/g, "") : rawPassword;
  const password = provider === "outlook" ? null : normalizedPassword ? sealSecret(normalizedPassword) : sameAccount ? existing?.password || null : null;
  const oauthRefreshToken = sameAccount && existing?.oauthClientId === oauthClientId ? existing.oauthRefreshToken : null;
  const digestMinutes = Number(form.get("digestMinutes"));
  if (![5, 15, 60].includes(digestMinutes)) return { ok: false, message: "Choose a 5, 15 or 60 minute summary interval." };
  const enabled = form.get("enabled") === "on";
  if (enabled && !(provider === "outlook" ? oauthRefreshToken && oauthClientId : password)) return { ok: false, message: provider === "outlook" ? "Save with alerts paused, connect Microsoft, then enable alerts." : "Enter an app password or SMTP password before enabling alerts." };
  const data = { provider, host, port, secure, username, fromAddress, recipient, password, oauthClientId, oauthRefreshToken, enabled, digestMinutes,
    notifyContent: form.get("notifyContent") === "on", notifySettings: form.get("notifySettings") === "on", notifySecurity: form.get("notifySecurity") === "on", notifySocial: form.get("notifySocial") === "on", notifyOperations: form.get("notifyOperations") === "on" };
  await prisma.$transaction(async (tx) => {
    await tx.mailSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
    // New recipient/preferences should never receive an old queued message.
    await tx.systemEvent.updateMany({ where: { mailStatus: "queued" }, data: { mailStatus: "suppressed" } });
    await tx.mailDelivery.updateMany({ where: { status: "queued" }, data: { status: "cancelled", error: "Mail settings changed. Queue a new test or activity summary." } });
    if (!sameAccount || existing?.oauthClientId !== oauthClientId) await tx.mailOAuthAttempt.deleteMany();
  });
  await recordSystemEvent({ category: "settings", title: "Email notification settings updated", detail: enabled ? "Administrator email alerts are enabled." : "Administrator email alerts are paused.", adminPath: "/admin/settings#email" });
  revalidatePath("/admin/settings");
  return { ok: true, message: enabled ? "Saved. Alerts are enabled. Send a test email to confirm delivery." : "Saved. Alerts are paused; you can still send a test email." };
}

export async function sendTestMail(): Promise<MailActionResult> {
  const admin = await requireSuperAdmin();
  if (!(await rateLimitDurable(`mail-test:${admin.id}`, 5, 10 * 60_000)).ok) return { ok: false, message: "Too many test emails. Try again in ten minutes." };
  const settings = await prisma.mailSettings.findUnique({ where: { id: "default" } });
  if (!mailReady(settings)) return { ok: false, message: "Save complete mail settings and account credentials first." };
  const delivery = await prisma.mailDelivery.create({ data: { kind: "test", recipient: settings!.recipient, subject: "OurDealsHub test email", text: "Your OurDealsHub mail connection is working.\n\nThis test was requested from Admin → Settings → Email notifications.\nNo account password or API keys are included in notification emails." } });
  const result = await processMailQueue({ testId: delivery.id });
  revalidatePath("/admin/settings");
  return { ok: result.status === "sent" || result.status === "busy", message: result.status === "sent" ? `Test accepted by the mail provider for ${settings!.recipient}. Check the inbox and spam folder.` : result.status === "busy" ? "Test queued. The mail worker will send it on its next run." : "Test was not confirmed. See delivery history for the result." };
}

export async function clearMailCredentials(): Promise<MailActionResult> {
  await requireSuperAdmin();
  await prisma.$transaction([
    prisma.mailSettings.updateMany({ where: { id: "default" }, data: { password: null, oauthRefreshToken: null, enabled: false } }),
    prisma.mailOAuthAttempt.deleteMany(),
    prisma.mailDelivery.updateMany({ where: { status: "queued" }, data: { status: "cancelled" } }),
    prisma.systemEvent.updateMany({ where: { mailStatus: "queued" }, data: { mailStatus: "suppressed" } }),
  ]);
  await recordSystemEvent({ category: "security", title: "Mail credentials removed", adminPath: "/admin/settings#email" });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Saved credentials removed and alerts paused." };
}

export async function retryMailDelivery(id: string): Promise<MailActionResult> {
  await requireSuperAdmin();
  const row = await prisma.mailDelivery.findUnique({ where: { id } });
  if (!row || !["failed", "uncertain"].includes(row.status)) return { ok: false, message: "This message cannot be retried." };
  const settings = await prisma.mailSettings.findUnique({ where: { id: "default" } });
  if (!mailReady(settings) || (row.kind !== "test" && !settings?.enabled)) return { ok: false, message: "Enable a working mail connection before retrying." };
  // UI explicitly asks the admin to check the inbox before an uncertain retry.
  await prisma.mailDelivery.updateMany({ where: { id, status: { in: ["failed", "uncertain"] } }, data: { status: "queued", error: null } });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Queued for another delivery attempt." };
}

export async function beginMicrosoftMailSignIn() {
  const admin = await requireSuperAdmin();
  if (!(await rateLimitDurable(`mail-oauth:${admin.id}`, 6, 15 * 60_000)).ok) return { ok: false as const, message: "Too many sign-in requests. Try again later." };
  const settings = await prisma.mailSettings.findUnique({ where: { id: "default" } });
  if (!strongSecret() || settings?.provider !== "outlook" || !settings.oauthClientId) return { ok: false as const, message: "Save your Outlook sender and Microsoft application client ID first." };
  try {
    const response = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode", { method: "POST", signal: AbortSignal.timeout(15_000), cache: "no-store", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: settings.oauthClientId, scope: MICROSOFT_SCOPES }) });
    const data = await response.json() as { device_code?: string; user_code?: string; interval?: number; expires_in?: number };
    if (!response.ok || !data.device_code || !data.user_code) return { ok: false as const, message: "Microsoft could not start sign-in. Check that your app supports personal accounts and public client/device-code flows." };
    const intervalSecs = Math.max(5, Math.min(30, Number(data.interval) || 5));
    await prisma.mailOAuthAttempt.deleteMany({ where: { adminId: admin.id } });
    const attempt = await prisma.mailOAuthAttempt.create({ data: { adminId: admin.id, clientId: settings.oauthClientId, deviceCode: sealSecret(data.device_code), intervalSecs, nextPollAt: new Date(Date.now() + intervalSecs * 1000), expiresAt: new Date(Date.now() + Math.min(900, Number(data.expires_in) || 900) * 1000) } });
    return { ok: true as const, id: attempt.id, userCode: data.user_code, verificationUrl: "https://microsoft.com/devicelogin", intervalSecs };
  } catch { return { ok: false as const, message: "Could not reach Microsoft sign-in. Try again later." }; }
}

export async function completeMicrosoftMailSignIn(id: string) {
  const admin = await requireSuperAdmin();
  const attempt = await prisma.mailOAuthAttempt.findFirst({ where: { id, adminId: admin.id } });
  const settings = await prisma.mailSettings.findUnique({ where: { id: "default" } });
  if (!attempt || attempt.expiresAt.getTime() <= Date.now() || settings?.provider !== "outlook" || settings.oauthClientId !== attempt.clientId) return { ok: false, pending: false, message: "This sign-in expired or settings changed. Start again." };
  if (attempt.nextPollAt.getTime() > Date.now()) return { ok: false, pending: true, message: "Waiting for Microsoft sign-in." };
  const claimed = await prisma.mailOAuthAttempt.updateMany({ where: { id, nextPollAt: { lte: new Date() } }, data: { nextPollAt: new Date(Date.now() + attempt.intervalSecs * 1000) } });
  if (!claimed.count) return { ok: false, pending: true, message: "Waiting for Microsoft sign-in." };
  try {
    const response = await fetch(MICROSOFT_TOKEN_URL, { method: "POST", signal: AbortSignal.timeout(15_000), cache: "no-store", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", client_id: attempt.clientId, device_code: openSecret(attempt.deviceCode) }) });
    const data = await response.json() as { refresh_token?: string; error?: string };
    if (data.error === "authorization_pending" || data.error === "slow_down") {
      if (data.error === "slow_down") await prisma.mailOAuthAttempt.updateMany({ where: { id }, data: { intervalSecs: attempt.intervalSecs + 5, nextPollAt: new Date(Date.now() + (attempt.intervalSecs + 5) * 1000) } });
      return { ok: false, pending: true, message: "Waiting for Microsoft sign-in." };
    }
    if (!response.ok || !data.refresh_token) {
      await prisma.mailOAuthAttempt.deleteMany({ where: { id } });
      return { ok: false, pending: false, message: "Microsoft sign-in was declined or expired. Start again." };
    }
    await prisma.mailSettings.updateMany({ where: { id: "default", provider: "outlook", oauthClientId: attempt.clientId, username: settings.username }, data: { oauthRefreshToken: sealSecret(data.refresh_token) } });
    await prisma.mailOAuthAttempt.deleteMany({ where: { id } });
    await recordSystemEvent({ category: "security", title: "Microsoft mail account connected", adminPath: "/admin/settings#email" });
    revalidatePath("/admin/settings");
    return { ok: true, pending: false, message: "Microsoft connected. Send a test email, then enable alerts." };
  } catch { return { ok: false, pending: true, message: "Could not check Microsoft yet. Try again shortly." }; }
}

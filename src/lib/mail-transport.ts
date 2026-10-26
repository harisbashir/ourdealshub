import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { MailSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { openSecret, sealSecret } from "@/lib/secret-box";

export const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
export const MICROSOFT_SCOPES = "https://outlook.office.com/SMTP.Send offline_access";

export function mailReady(settings: MailSettings | null): boolean {
  return Boolean(settings?.host && settings.username && settings.fromAddress && settings.recipient && (settings.provider === "outlook" ? settings.oauthClientId && settings.oauthRefreshToken : settings.password));
}

/** Never return raw SMTP errors: they may echo credentials or connection data. */
export function safeMailError(error: unknown): { message: string; uncertain: boolean } {
  const problem = error as { code?: string; command?: string; responseCode?: number };
  if (problem?.code === "EAUTH") return { message: "The provider rejected sign-in. Check the Gmail app password, SMTP credentials, or reconnect Microsoft.", uncertain: false };
  if (problem?.code === "EENVELOPE") return { message: "The provider rejected the sender or recipient address. Check the saved addresses.", uncertain: false };
  if (problem?.responseCode && problem.responseCode >= 400) return { message: `The mail provider rejected the message (SMTP ${problem.responseCode}). Check its limits and account settings.`, uncertain: false };
  if (["CONN", "EHLO", "HELO", "STARTTLS", "AUTH"].includes(problem?.command || "")) return { message: "Could not establish a secure connection to the mail provider. Check the host, port and network access.", uncertain: false };
  return { message: "The provider did not confirm delivery. Check the recipient's inbox before retrying.", uncertain: true };
}

async function outlookAccessToken(settings: MailSettings) {
  if (!settings.oauthRefreshToken) throw Object.assign(new Error("Reconnect Microsoft."), { code: "EAUTH" });
  let response: Response;
  try {
    response = await fetch(MICROSOFT_TOKEN_URL, {
      method: "POST", signal: AbortSignal.timeout(15_000), cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: settings.oauthClientId, refresh_token: openSecret(settings.oauthRefreshToken), scope: MICROSOFT_SCOPES }),
    });
  } catch { throw Object.assign(new Error("Microsoft sign-in is unavailable."), { command: "AUTH" }); }
  const data = await response.json().catch(() => ({})) as { access_token?: string; refresh_token?: string };
  if (!response.ok || !data.access_token) throw Object.assign(new Error("Reconnect Microsoft."), { code: "EAUTH" });
  if (data.refresh_token) await prisma.mailSettings.updateMany({ where: { id: "default", oauthRefreshToken: settings.oauthRefreshToken, oauthClientId: settings.oauthClientId }, data: { oauthRefreshToken: sealSecret(data.refresh_token) } });
  return data.access_token;
}

export async function sendSystemMail(settings: MailSettings, message: { subject: string; text: string; id: string }): Promise<string> {
  if (!mailReady(settings)) throw Object.assign(new Error("Mail isn't configured."), { code: "EAUTH" });
  const auth = settings.provider === "outlook"
    ? { type: "OAuth2" as const, user: settings.username, accessToken: await outlookAccessToken(settings) }
    : { user: settings.username, pass: openSecret(settings.password) };
  const transportOptions: SMTPTransport.Options = {
    host: settings.host, port: settings.port, secure: settings.secure,
    requireTLS: !settings.secure, tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    auth, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 25_000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  };
  const transporter = nodemailer.createTransport(transportOptions);
  try {
    const domain = settings.fromAddress.split("@")[1];
    const info = await transporter.sendMail({
      from: { name: "OurDealsHub", address: settings.fromAddress }, to: settings.recipient,
      subject: message.subject, text: message.text, messageId: `<ourdealshub-${message.id}@${domain}>`,
      disableFileAccess: true, disableUrlAccess: true,
    });
    if (!info.accepted?.length) throw Object.assign(new Error("No recipient accepted."), { code: "EENVELOPE" });
    return String(info.messageId).slice(0, 191);
  } finally { transporter.close(); }
}

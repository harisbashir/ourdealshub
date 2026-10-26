"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, ShieldCheck, ExternalLink } from "lucide-react";
import { saveMailSettings, sendTestMail, clearMailCredentials, retryMailDelivery, beginMicrosoftMailSignIn, completeMicrosoftMailSignIn, type MailActionResult } from "@/lib/mail-actions";
import { inputClass, labelClass, hintClass, primaryButtonClass, secondaryButtonClass, StatusBadge } from "@/components/admin/ui";

export type MailSettingsView = {
  enabled: boolean; provider: string; host: string; port: number; secure: boolean;
  username: string; fromAddress: string; recipient: string; oauthClientId: string;
  hasPassword: boolean; oauthConnected: boolean; digestMinutes: number;
  notifyContent: boolean; notifySettings: boolean; notifySecurity: boolean; notifySocial: boolean; notifyOperations: boolean;
  lastSentAt: string | null; lastWorkerAt: string | null;
};
export type MailDeliveryView = { id: string; subject: string; kind: string; status: string; recipient: string; error: string | null; createdAt: string };
const PREFERENCES = [
  ["notifyContent", "Catalog and blog changes", "Deals, categories, publishing, samples and blog edits."],
  ["notifySettings", "Settings and API connections", "Changes to site settings, appearance and saved API credentials."],
  ["notifySecurity", "Admin access and security", "Admin accounts, sign-ins, password changes and sign-in rate limits."],
  ["notifySocial", "Social automation", "Successful posts, failed or uncertain deliveries and expiring tokens."],
  ["notifyOperations", "System operations", "Deployments, backups, maintenance, runtime errors and health checks."],
] as const;

export function MailSettingsForm({ initial, deliveries, events }: { initial: MailSettingsView; deliveries: MailDeliveryView[]; events: { id: string; title: string; category: string; level: string; createdAt: string }[] }) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial.provider);
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MailActionResult | null>(null);
  const [oauth, setOauth] = useState<{ id: string; userCode: string; verificationUrl: string; intervalSecs: number; tick: number } | null>(null);
  const busy = pending || running;

  useEffect(() => {
    if (!oauth || pending) return;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const response = await completeMicrosoftMailSignIn(oauth.id);
        if (response.pending) { setOauth((previous) => previous ? { ...previous, tick: previous.tick + 1 } : null); return; }
        setOauth(null); setResult({ ok: response.ok, message: response.message }); router.refresh();
      });
    }, oauth.intervalSecs * 1000);
    return () => clearTimeout(timer);
  }, [oauth, pending, router]);

  function run(action: () => Promise<MailActionResult>) {
    setResult(null);
    setRunning(true);
    void action().then(setResult).catch(() => {
      setResult({ ok: false, message: "The request could not finish. Refresh to check the saved settings and delivery history." });
    }).finally(() => { setRunning(false); router.refresh(); });
  }
  const notice = result;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge tone={initial.enabled ? "success" : "neutral"}>{initial.enabled ? "Alerts enabled" : "Alerts paused"}</StatusBadge>
      <p className="text-[13px] text-muted">{initial.lastWorkerAt ? `Worker last checked ${new Date(initial.lastWorkerAt).toLocaleString()}` : "Mail worker has not checked yet"}</p>
    </div>
    <form onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      run(async () => {
        const response = await saveMailSettings(null, data);
        if (response.ok) {
          const password = form.elements.namedItem("password");
          if (password instanceof HTMLInputElement) password.value = "";
        }
        return response;
      });
    }} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="mail-provider" className={labelClass}>Email provider</label>
          <select id="mail-provider" name="provider" value={provider} onChange={(event) => { setProvider(event.target.value); setOauth(null); }} className={`${inputClass} mt-1.5`}>
            <option value="gmail">Gmail</option><option value="outlook">Outlook.com / Hotmail</option><option value="custom">Other SMTP provider</option>
          </select>
        </div>
        <div><label htmlFor="mail-recipient" className={labelClass}>Send notifications to</label><input id="mail-recipient" name="recipient" type="email" required defaultValue={initial.recipient} autoComplete="off" placeholder="your-private-email@gmail.com" className={`${inputClass} mt-1.5`} /></div>
      </div>
      <div><label htmlFor="mail-username" className={labelClass}>{provider === "custom" ? "SMTP username" : "Sender email address"}</label><input id="mail-username" name="username" type={provider === "custom" ? "text" : "email"} required defaultValue={initial.username} autoComplete="off" className={`${inputClass} mt-1.5`} placeholder="you@gmail.com" /></div>
      {provider === "gmail" && <p className="rounded-xl bg-card-muted p-4 text-[15px] leading-relaxed text-muted">Turn on 2-Step Verification in your Google account, then create an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">app password</a> for OurDealsHub. Enter that app password here; your normal Gmail password is not needed. Gmail connects securely through smtp.gmail.com.</p>}
      {provider !== "outlook" && <div><label htmlFor="mail-password" className={labelClass}>{provider === "gmail" ? "Gmail app password" : "SMTP password"}</label><input key={provider} id="mail-password" name="password" type="password" autoComplete="new-password" maxLength={1000} placeholder={initial.hasPassword && provider === initial.provider ? "Saved — leave blank to keep it" : "Enter your app or SMTP password"} className={`${inputClass} mt-1.5`} /><p className={hintClass}>Stored encrypted. Never shown again after saving. Changing the account or server requires fresh credentials.</p></div>}
      {provider === "custom" && <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="mail-from" className={labelClass}>From email address</label><input id="mail-from" name="fromAddress" type="email" required defaultValue={initial.fromAddress} className={`${inputClass} mt-1.5`} /></div>
        <div><label htmlFor="mail-host" className={labelClass}>SMTP host</label><input id="mail-host" name="host" required defaultValue={initial.provider === "custom" ? initial.host : ""} placeholder="smtp.your-provider.com" className={`${inputClass} mt-1.5`} /></div>
        <div><label htmlFor="mail-port" className={labelClass}>SMTP port</label><input id="mail-port" name="port" type="number" min={1} max={65535} required defaultValue={initial.provider === "custom" ? initial.port : 587} className={`${inputClass} mt-1.5`} /></div>
        <div><label htmlFor="mail-encryption" className={labelClass}>Encryption</label><select id="mail-encryption" name="secure" defaultValue={initial.secure && initial.provider === "custom" ? "tls" : "starttls"} className={`${inputClass} mt-1.5`}><option value="starttls">STARTTLS (usually port 587)</option><option value="tls">TLS (usually port 465)</option></select></div>
      </div>}
      {provider === "outlook" && <div className="space-y-3 rounded-xl bg-card-muted p-4">
        <p className="text-[15px] leading-relaxed text-muted">Outlook uses Microsoft sign-in instead of a normal password. Register an app that supports personal Microsoft accounts, allow public client/device-code flows, and grant delegated <strong>SMTP.Send</strong>. Save its client ID here, then connect below. No client secret is needed.</p>
        <a href="https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-brand">Microsoft setup guide <ExternalLink className="h-4 w-4" aria-hidden /></a>
        <div><label htmlFor="mail-client-id" className={labelClass}>Microsoft application client ID</label><input id="mail-client-id" name="oauthClientId" defaultValue={initial.oauthClientId} placeholder="00000000-0000-0000-0000-000000000000" className={`${inputClass} mt-1.5`} autoComplete="off" /></div>
        <p className="text-[13px] text-muted">{initial.oauthConnected && provider === initial.provider ? "Microsoft credentials are connected." : "Save with alerts paused before connecting Microsoft."}</p>
      </div>}
      <fieldset className="space-y-4 border-t border-border-subtle pt-5"><legend className="text-lg font-semibold tracking-tight text-foreground">What to notify you about</legend>
        {PREFERENCES.map(([key, title, description]) => <label key={key} className="flex min-h-11 items-start gap-3"><input type="checkbox" name={key} defaultChecked={initial[key]} className="mt-1 h-5 w-5 accent-brand" /><span><span className="block text-[15px] font-medium text-foreground">{title}</span><span className="mt-0.5 block text-[13px] text-muted">{description}</span></span></label>)}
      </fieldset>
      <div><label htmlFor="mail-digest" className={labelClass}>Group routine updates</label><select id="mail-digest" name="digestMinutes" defaultValue={initial.digestMinutes} className={`${inputClass} mt-1.5`}><option value={5}>Every 5 minutes</option><option value={15}>Every 15 minutes</option><option value={60}>Every hour</option></select><p className={hintClass}>Errors are sent on the next worker run, usually within a minute. Visitor clicks never generate email.</p></div>
      <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="enabled" defaultChecked={initial.enabled} className="h-5 w-5 accent-brand" /><span className="text-[15px] font-semibold text-foreground">Enable email notifications</span></label>
      <button type="submit" disabled={busy} className={primaryButtonClass}><ShieldCheck className="h-4 w-4" aria-hidden />{busy ? "Working…" : "Save email settings"}</button>
      <p className={hintClass}>Saving a different account or preferences clears queued summaries. New events use the saved preferences.</p>
    </form>
    {provider === "outlook" && <div className="space-y-3">
      <button type="button" disabled={busy || !initial.oauthClientId || initial.provider !== "outlook"} className={secondaryButtonClass} onClick={() => { setResult(null); startTransition(async () => { const response = await beginMicrosoftMailSignIn(); if (response.ok) setOauth({ ...response, tick: 0 }); else setResult({ ok: false, message: response.message }); }); }}>Connect Microsoft account</button>
      {oauth && <div className="space-y-3 rounded-xl bg-card-muted p-4"><p className="text-[15px] text-foreground">Open Microsoft sign-in and enter this code:</p><p className="select-all text-2xl font-semibold tracking-widest text-foreground">{oauth.userCode}</p><a className={primaryButtonClass} href={oauth.verificationUrl} target="_blank" rel="noopener noreferrer">Open Microsoft sign-in <ExternalLink className="h-4 w-4" aria-hidden /></a><p role="status" className="text-[13px] text-muted">Waiting for you to approve this connection in Microsoft.</p><button type="button" className={secondaryButtonClass} onClick={() => setOauth(null)}>Cancel sign-in</button></div>}
    </div>}
    <div className="flex flex-wrap gap-3 border-t border-border-subtle pt-5"><button type="button" disabled={busy} onClick={() => run(sendTestMail)} className={secondaryButtonClass}><Send className="h-4 w-4" aria-hidden />{busy && !oauth ? "Working…" : "Send test email"}</button>{(initial.hasPassword || initial.oauthConnected) && <button type="button" disabled={busy} onClick={() => run(clearMailCredentials)} className={secondaryButtonClass}>Remove saved credentials</button>}</div>
    <p className="text-[13px] text-muted">Save first. A test goes only to the saved notification address and works while routine alerts are paused.</p>
    {notice && <p role="status" className={`rounded-xl p-4 text-[15px] ${notice.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{notice.message}</p>}
    <section className="space-y-3 border-t border-border-subtle pt-5" aria-labelledby="mail-delivery-heading"><h3 id="mail-delivery-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground"><Mail className="h-5 w-5" aria-hidden />Delivery history</h3>
      {!deliveries.length ? <p className="text-[15px] text-muted">No messages yet. Save your connection, then send a test.</p> : <ul className="divide-y divide-border-subtle">{deliveries.map((delivery) => <li key={delivery.id} className="space-y-2 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[15px] font-medium text-foreground">{delivery.subject}</p><StatusBadge tone={delivery.status === "sent" ? "success" : ["failed", "uncertain"].includes(delivery.status) ? "danger" : "neutral"}>{delivery.status === "sent" ? "Provider accepted" : delivery.status}</StatusBadge></div><p className="break-all text-[13px] text-muted">{delivery.recipient} · {new Date(delivery.createdAt).toLocaleString()}</p>{delivery.error && <p className="text-[15px] text-danger">{delivery.error}</p>}{["failed", "uncertain"].includes(delivery.status) && <button type="button" disabled={busy} onClick={() => run(() => retryMailDelivery(delivery.id))} className={secondaryButtonClass}>{delivery.status === "uncertain" ? "I checked the inbox — retry" : "Queue another attempt"}</button>}</li>)}</ul>}
    </section>
    <section className="space-y-3 border-t border-border-subtle pt-5" aria-labelledby="system-events-heading"><h3 id="system-events-heading" className="text-lg font-semibold text-foreground">Recent system activity</h3><p className="text-[13px] text-muted">Activity is recorded even while email is paused. Credentials and visitor clicks are excluded.</p>{!events.length ? <p className="text-[15px] text-muted">New changes and system events will appear here.</p> : <ul className="divide-y divide-border-subtle">{events.map((event) => <li key={event.id} className="py-3"><p className="text-[15px] font-medium text-foreground">{event.title}</p><p className="mt-1 text-[13px] text-muted">{event.category} · {event.level} · {new Date(event.createdAt).toLocaleString()}</p></li>)}</ul>}</section>
  </div>;
}

# Administrator email notifications

Configure **Admin → Settings → Email notifications**. Only Super Admins can
read/change the sender, connect Microsoft, send tests or retry a message.
Notification delivery is off until an account is configured and alerts are enabled.

## Gmail (recommended for the private account)

1. Turn on **2-Step Verification** in the Google account.
2. Generate a dedicated [Google app password](https://myaccount.google.com/apppasswords).
3. Select Gmail in the app. Enter the sender address, notification recipient,
   and app password. Keep alerts paused and save.
4. Click **Send test email**. Check both Inbox and Spam.
5. Choose event categories and summary frequency, enable notifications, and save.

The preset uses `smtp.gmail.com:465` with certificate-verified TLS. It uses the
app password, not a normal Google account password. Spaces in Google's displayed
app password are removed. Some managed/Advanced Protection accounts do not offer
app passwords; use a supported SMTP mailbox instead.

## Personal Outlook.com / Hotmail

Microsoft requires modern OAuth authentication. The app supports personal
Microsoft accounts using its device authorization flow, which works on the LAN
without a public OAuth callback URL.

1. Register a Microsoft Entra application supporting **personal Microsoft
   accounts** (or both organizational and personal accounts).
2. Enable public client/device-code flows and add delegated Outlook/Exchange
   **SMTP.Send** permission. The requested scopes are
   `https://outlook.office.com/SMTP.Send offline_access`.
3. In mail settings, select Outlook and save the sender, recipient, and
   application's client ID with alerts paused.
4. Click **Connect Microsoft account**. Open the Microsoft sign-in link and enter
   the displayed code. Sign in to the same account used as the sender.
5. After connection, send a test, then enable alerts.

The preset uses `smtp-mail.outlook.com:587` with required STARTTLS and OAuth2.
Refresh tokens are encrypted, refreshed when sending, and rotated when Microsoft
issues replacements. No Microsoft account password or client secret is stored.
The preset targets personal accounts, not an Exchange organization's tenant
policies; those require the appropriate organizational configuration.

## Other SMTP providers

Use **Other SMTP provider** for Hostinger Email or another authenticated SMTP
mailbox. Set the server, port, username, password, sender and recipient.
Choose TLS (usually 465) or required STARTTLS (usually 587). Certificate
verification stays enabled. Hostinger lists outbound ports 465/587 as available;
port 25 is not supported on its managed hosting.

Credentials remain encrypted using `AUTH_SECRET`. Blank password fields preserve
saved credentials only for the same server/account. Changing the account/server
clears the old secret unless a new one is supplied. Keep the authentication
secret unchanged when moving the site.

## What is recorded and emailed

- Content: product/category/blog changes, publishing, sample catalog changes,
  manual Amazon refreshes.
- Settings: API credential changes, theme, publishing preferences and social
  connections. Secret values are never included.
- Security: successful admin sign-ins, account/password/access changes, and
  throttled sign-in attempts (deduplicated).
- Social: confirmed posts, failed/uncertain deliveries and token-expiry reminders.
- Operations: native deployment results, detected release-folder changes,
  backup success/failure, daily maintenance results, missing daily heartbeat,
  website failure/recovery and reported server errors.

Routine activity is grouped over 5, 15 or 60 minutes. Selected error events are
eligible on the next worker run, usually within a minute. Visitor clicks and
background heartbeat updates do not produce email. Activity and delivery history
are retained for 90 days. Up to 100 events are included per summary.

This is application-level monitoring. A powered-off VM, failed database or
completely broken cron/runtime can prevent the notifier itself from running.
Use an external uptime monitor for independent outage coverage. Manual OS changes
and direct SQL writes outside the app are not a complete audit trail here.

## Scheduling

The VM installs a finite **mail worker every minute** in
`/etc/cron.d/ourdealshub-managed`. On Hostinger, add a Node 22 cron job each minute:

```text
/opt/alt/alt-nodejs22/root/bin/node --env-file=/home/USER/domains/DOMAIN/hbuilds/config/.env /home/USER/domains/DOMAIN/hbuilds/current/nodejs/scripts/cron-mail.mjs
```

Replace paths with the actual deployment paths. Keep the command within hPanel's
length limit. The script exits after a bounded batch; no persistent daemon is
needed. It also prunes old records and expired sign-in attempts.

`APP_HEALTH_URL` is optional. On the VM it is `http://127.0.0.1:3000/`, so checks
work without trusting the LAN certificate in Node. On managed hosting the default
is the configured public HTTPS site URL. This URL is an environment setting,
not a value sent by a website visitor.

Native deployment scripts emit success/failure events. Hostinger release folders
are detected by the scheduled monitor after email has been enabled. The Node
backup script emits backup results; provider-managed backups do not send app
notifications unless their results are separately integrated.

## Delivery behavior

Messages are authenticated and sent over TLS. A provider accepting SMTP delivery
does not guarantee Inbox placement; check spam filters and mailbox/provider limits.
Failures are visible in Settings. Tests use the saved recipient, even while alerts
are paused; server-side limits restrict repeated tests.

A lease and atomic claim prevent concurrent workers from sending a queued message
twice. Interrupted/ambiguous SMTP writes become **uncertain** and are never
retried automatically. Check the recipient's inbox before using the explicit
retry button. Confirmed failures can also be retried after fixing the connection.
Changing mail preferences/account cancels queued summaries so older events are
not accidentally sent under a new configuration.

## Validation before activation

Automated tests cover digest preferences, encryption-safe browser views,
concurrent delivery claims, SMTP error redaction, and uncertain-write behavior.
A local TLS SMTP capture verifies actual authentication and MIME delivery without
sending to an outside mailbox. Real Gmail/Microsoft account acceptance still
requires configuring that account and sending its test message.

## Provider references

- [Google app passwords](https://support.google.com/accounts/answer/185833)
- [Outlook settings and modern authentication](https://support.microsoft.com/en-us/outlook/pop-imap-and-smtp-settings-for-outlook-com)
- [Microsoft SMTP OAuth scopes](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth)
- [Microsoft device flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code)
- [Hostinger outbound connectivity](https://www.hostinger.com/support/which-web-standards-and-connectivity-features-are-supported-at-hostinger/)

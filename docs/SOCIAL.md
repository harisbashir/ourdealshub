# Social automation

Super Admin → **Automation** supports Facebook, Threads, Telegram, Instagram,
and Pinterest. Credentials are verified before saving and encrypted using the
existing authentication secret. Only a Super Admin can configure channels or
retry/resolve a delivery.

## Instagram

Use a Business or Creator account and **Instagram API with Instagram Login**.
Provide the numeric Instagram user ID, a valid Instagram user access token,
and the expiry date from the developer dashboard. Required scopes:
`instagram_business_basic` and `instagram_business_content_publish`.
This integration uses `graph.instagram.com/v25.0`; a Facebook Page token is not
interchangeable. Meta may require app review/production access for accounts
outside your app's roles.

The app creates an original JPEG editorial card, creates an Instagram media
container, polls its processing status for a bounded period, and publishes only
when ready. It does not send or rehost Amazon product photographs. Captions
include affiliate disclosures and direct people to your website in your bio;
Instagram caption URLs are not clickable. Set the bio link manually.

## Pinterest

Create a Pinterest business/developer app. Supply a numeric **public board ID**,
its access token, and actual expiry date. The token needs `boards:read`,
`pins:read`, and `pins:write`; the token's account must be allowed to write to the
board. Production access may require Pinterest approval.

The v5 Pin API receives the original editorial image, title, disclosed caption
and the product owner's stored Amazon affiliate URL. No Amazon photo is copied
into Pinterest. The connection check verifies board access; the first real
publish also verifies the granted write scope.

## Public website required

Instagram/Pinterest fetch share-card images from your server. The LAN address
`https://ourdeals.lan` is a preview environment, so image-channel delivery is
blocked there with an explanation. On Hostinger, use a publicly resolvable HTTPS
domain and valid certificate. The image route `/api/social-image/<deal-slug>`
is public only for published, non-expired, non-archived listings and returns
an original JPEG. No secrets are included in its URL or artwork.

You can preview the generated artwork locally from the channel setup panel.
Real social credentials and a public deployment are required for live acceptance
testing; the automated test suite uses mocked platform HTTP responses.

## Queue and schedule

Publishing a real deal creates one durable delivery per connected channel.
A unique `(productId, platform)` key and an atomic job claim prevent duplicate
workers from publishing it twice. Previous successful post history is respected.
Draft, expired, archived and sample listings are excluded.

Schedule **`scripts/cron-social.mjs` every five minutes** in hPanel, using the
same Node 22 `--env-file` configuration as the daily job:

```text
/opt/alt/alt-nodejs22/root/bin/node --env-file=/home/USER/domains/DOMAIN/hbuilds/config/.env /home/USER/domains/DOMAIN/hbuilds/current/nodejs/scripts/cron-social.mjs
```

The finite worker observes daily caps and token expiry, and limits each batch.
It does not run inside a web request or require a persistent background process.
The VM uses `/etc/cron.d/ourdealshub-managed` with a file lock and timeout.
Docker-only installations also need this scheduled script; the old daily HTTP
schedule alone does not drain the social queue.

Confirmed failures can be queued again from Automation. Timeouts/ambiguous
writes and interrupted jobs become **uncertain**: check the external account,
then choose “already posted” or “retry.” They are never retried automatically.
Pausing global social publishing pauses the worker. Disabled channels cancel
unstarted jobs; publishing/retrying after reconnect is an explicit admin action.

## References

- [Meta Instagram Login publishing](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/)
- [Meta's Instagram API collection](https://www.postman.com/meta/instagram/)
- [Pinterest boards and Pins](https://developer.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/)

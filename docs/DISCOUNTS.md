# Verified savings and shopping buttons

Public cards, deal pages and the mobile sticky action use **Get deal on Amazon**.
Real shopping links still pass through `/go/[slug]` for safe Amazon redirects,
the owner's tracking ID and click analytics. Samples use **Preview deal**, stay
inside the site, and show clearly labelled illustrative savings.

`amazon-discounts.ts` extracts the featured new, available offer's
`offersV2.listings.price.savings.percentage` from the Creators API. It requires
an explicit non-MAP offer and a saving-basis label. Restricted-access, used,
subscription, future, expired or malformed offers do not produce a badge.
Savings are not calculated from prices or accepted from admin forms. Authored
copy still rejects prices, coupons and manually written savings claims.

The API timestamp, comparison basis and expandable pricing disclaimer accompany
real savings. Badges expire at the earlier of the promotion's end or 24 hours
after retrieval, including in an already-open tab. API refreshes overwrite old
savings, and unavailable items lose their savings immediately. API failures
never extend a savings timestamp. Slugs, owners and affiliate tags stay intact.

The native VM runs `scripts/cron-amazon.mjs` hourly, sharing the daily job's lock.
It clears expired cached discounts, then refreshes up to 150 products per
marketplace, oldest first, using each owner's tracking ID. Daily maintenance
and manual Amazon refreshes also update savings. Large catalogs may require
adjusting the batch size and schedule within the account's API quota.

On Hostinger, schedule the finite Node 22 command hourly using the same absolute
environment/script paths as the daily job, replacing `cron-daily.mjs` with
`cron-amazon.mjs`. Run `npm run cron:amazon` manually from a configured checkout.
Only configured US/UK/CA Amazon accounts are queried. Without an eligible API
offer the real card retains its shopping button and displays no percentage.

References: [OffersV2](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/resources/offersV2),
[GetItems resources](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/get-items),
[Associates policies, IP License §2(h–i)](https://affiliate-program.amazon.com/help/operating/policies).

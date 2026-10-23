import type { Metadata } from "next";
import Link from "next/link";
import {
  AMAZON_ASSOCIATE_STATEMENT,
  AMAZON_CONTENT_NOTICE,
  AMAZON_PROGRAM_BLURB,
} from "@/lib/affiliate-disclosure";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "How OurDealsHub participates in the Amazon Associates Program and discloses paid links.",
  alternates: { canonical: "/disclosure" },
};

export default function DisclosurePage() {
  return (
    <div className="site-container max-w-2xl pb-4 pt-4">
      <h1 className="text-[28px] font-bold tracking-tight text-foreground sm:text-[34px]">
        Affiliate Disclosure
      </h1>
      <p className="mt-3 rounded-2xl bg-card px-4 py-3 text-[17px] font-medium text-foreground ring-1 ring-border-subtle">
        {AMAZON_ASSOCIATE_STATEMENT}
      </p>

      <div className="prose-page mt-4 space-y-4 text-[17px]">
        <p>{AMAZON_PROGRAM_BLURB}</p>

        <h2>Paid links</h2>
        <p>
          Every &ldquo;View on Amazon&rdquo; button is a paid link, and it&apos;s labelled
          &ldquo;Paid link&rdquo;. If you follow one and buy something, Amazon may pay
          OurDealsHub a commission. You pay exactly the same price as you would going to Amazon
          directly. Commissions help keep the site running.
        </p>

        <h2>How picks are chosen and written</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Products are picked by the OurDealsHub team; no brand pays to be included.</li>
          <li>
            Write-ups summarise each product&apos;s listed features in plain words. Some are
            drafted with the help of AI and checked against Amazon&apos;s product details
            before they&apos;re published.
          </li>
          <li>
            Prices, discounts, coupons, reviews and star ratings aren&apos;t shown here. They
            change constantly, so you&apos;ll always see the current ones on Amazon.
          </li>
          <li>
            Product photos and some product details come from Amazon and are refreshed every
            day. Unavailable products are removed.
          </li>
        </ul>

        <h2>Amazon content</h2>
        <p>{AMAZON_CONTENT_NOTICE}</p>

        <p className="border-t border-border-subtle pt-4 text-[13px]">
          Amazon, Amazon.com, Amazon.co.uk and related marks are trademarks of Amazon.com, Inc.
          or its affiliates. OurDealsHub is independent and isn&apos;t operated or endorsed by
          Amazon. Questions? <Link href="/contact">Contact us</Link>.
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import {
  AFFILIATE_LINK_NOTE,
  AMAZON_ASSOCIATE_STATEMENT,
  AMAZON_PROGRAM_BLURB,
} from "@/lib/affiliate-disclosure";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "How OurDealsHub participates in the Amazon Associates Program and discloses affiliate relationships.",
  alternates: { canonical: "/disclosure" },
};

export default function DisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        Affiliate Disclosure
      </h1>
      <p className="text-sm text-muted mb-8">
        Clear notice of our material connection with Amazon, per Amazon
        Associates and FTC endorsement guidance.
      </p>

      <div className="space-y-5 text-muted leading-relaxed text-sm sm:text-base">
        <p className="rounded-xl border border-brand/25 bg-brand-soft px-4 py-3 text-foreground font-medium">
          {AMAZON_ASSOCIATE_STATEMENT}
        </p>

        <p>{AMAZON_PROGRAM_BLURB}</p>

        <p>
          {AFFILIATE_LINK_NOTE} Buttons such as &quot;View on Amazon&quot; use
          Amazon Associates Special Links
          (tracked affiliate URLs). Clicking them and completing a qualifying
          purchase may generate a commission for OurDealsHub.
        </p>

        <h2 className="text-lg font-semibold text-foreground pt-2">
          What this means for you
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>You pay the same price as going to Amazon directly.</li>
          <li>
            Product prices, stock, and eligibility are controlled by Amazon and
            may change at any time.
          </li>
          <li>
            We do not invent coupon codes, fake &quot;% off&quot; claims, or
            unverifiable savings language.
          </li>
          <li>
            Editorial picks are curated by OurDealsHub; commissions help support
            the site.
          </li>
        </ul>

        <p className="text-xs text-muted-fg pt-4 border-t border-border">
          Amazon, Amazon.com, and related marks are trademarks of Amazon.com,
          Inc. or its affiliates. OurDealsHub is not Amazon. For Amazon&apos;s
          program rules, see the Amazon Associates Operating Agreement on
          Associates Central.
        </p>
      </div>
    </div>
  );
}

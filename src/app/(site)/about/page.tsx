import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "OurDealsHub curates Amazon product picks. As an Amazon Associate, OurDealsHub earns from qualifying purchases.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="site-container max-w-2xl pb-4 pt-4">
      <h1 className="text-[28px] font-bold tracking-tight text-foreground sm:text-[34px]">About OurDealsHub</h1>
      <p className="text-sm text-muted mb-8">
        Curated Amazon deals — clear picks, honest disclosure.
      </p>

      <div className="prose-page mt-4 space-y-4 text-[17px]">
        <p>
          OurDealsHub helps you discover curated Amazon product picks. We
          highlight items our editors think are worth a look — always with
          clear affiliate disclosure.
        </p>
        <p>
          We do not invent prices, coupon codes, or unverifiable “% off” claims.
          Final price, stock, and eligibility are always on Amazon.
        </p>
        <p>
          As an Amazon Associate, OurDealsHub earns from qualifying purchases.
          That commission does not change what you pay. Read our{" "}
          <Link href="/disclosure" className="text-brand font-medium hover:underline">
            Affiliate Disclosure
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brand font-medium hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          Questions?{" "}
          <Link href="/contact" className="text-brand font-medium hover:underline">
            Contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

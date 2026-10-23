import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for OurDealsHub.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Use</h1>
      <p className="text-sm text-muted mb-8">Last updated: October 2026</p>

      <div className="space-y-5 text-sm sm:text-base text-muted leading-relaxed">
        <p>
          By using OurDealsHub you agree to these terms. If you do not agree,
          please do not use the site.
        </p>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Editorial content
          </h2>
          <p>
            Deal write-ups are for information only. Product availability,
            pricing, and promotions are controlled by Amazon and may change
            without notice.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Affiliate relationships
          </h2>
          <p>
            We participate in the Amazon Associates Program. See our{" "}
            <Link href="/disclosure" className="text-brand hover:underline">
              Affiliate Disclosure
            </Link>
            .
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            No warranties
          </h2>
          <p>
            The site is provided “as is”. We are not responsible for Amazon
            purchases, third-party sites, or losses arising from use of this
            site.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Contact
          </h2>
          <p>
            Questions about these terms:{" "}
            <Link href="/contact" className="text-brand hover:underline">
              Contact
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

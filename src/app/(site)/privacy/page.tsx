import type { Metadata } from "next";
import Link from "next/link";
import { getContactEmail } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How OurDealsHub collects and uses information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const email = getContactEmail();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted mb-8">Last updated: October 2026</p>

      <div className="space-y-6 text-sm text-muted leading-relaxed">
        <p>
          OurDealsHub (“we”, “us”) operates this website to share curated Amazon
          deals. This page explains what limited data we collect and why.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Affiliate links &amp; clicks
          </h2>
          <p>
            When you click “View on Amazon”, we may record an anonymous click event
            (time, product, coarse browser/referrer info) so we can understand
            which deals are popular. We do not use this to identify you
            personally.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Cookies</h2>
          <p>
            Admin login uses a session cookie required to keep editors signed
            in. Public browsing does not require an account. Third-party sites
            (e.g. Amazon) may set their own cookies after you leave OurDealsHub.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Amazon Associates
          </h2>
          <p>
            We participate in the Amazon Services LLC Associates Program. See
            our{" "}
            <Link href="/disclosure" className="text-brand hover:underline">
              Affiliate Disclosure
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Contact</h2>
          <p>
            Questions about privacy? Email{" "}
            <a
              href={`mailto:${email}`}
              className="text-brand font-medium hover:underline"
            >
              {email}
            </a>{" "}
            or visit our{" "}
            <Link href="/contact" className="text-brand hover:underline">
              Contact
            </Link>{" "}
            page.
          </p>
        </section>
      </div>
    </div>
  );
}

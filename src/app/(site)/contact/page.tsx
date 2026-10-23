import type { Metadata } from "next";
import Link from "next/link";
import { getContactEmail } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact OurDealsHub.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const email = getContactEmail();

  return (
    <div className="site-container max-w-2xl pb-4 pt-4">
      <h1 className="text-[28px] font-bold tracking-tight text-foreground sm:text-[34px]">Contact</h1>
      <p className="text-sm text-muted mb-8">
        Privacy questions, partnership notes, or site feedback.
      </p>

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-sm">
        <p className="text-sm text-muted">
          Email us at{" "}
          <a
            href={`mailto:${email}?subject=${encodeURIComponent("OurDealsHub inquiry")}`}
            className="font-semibold text-brand hover:underline"
          >
            {email}
          </a>
          .
        </p>
        <p className="text-xs text-muted-fg">
          Typical reply within 1–2 business days. Include links or screenshots
          when reporting a broken deal.
        </p>
        <p className="text-xs text-muted-fg">
          We are not Amazon Customer Service. For orders, returns, or account
          issues, contact Amazon directly.
        </p>
      </div>

      <p className="mt-8 text-sm text-muted">
        Also see{" "}
        <Link href="/disclosure" className="text-brand hover:underline">
          Affiliate Disclosure
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-brand hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

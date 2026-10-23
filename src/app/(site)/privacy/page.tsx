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
    <div className="site-container max-w-2xl pb-4 pt-4">
      <h1 className="text-[28px] font-bold tracking-tight text-foreground sm:text-[34px]">
        Privacy Policy
      </h1>
      <p className="mt-1 text-[15px] text-muted">Last updated: October 2026</p>

      <div className="prose-page mt-4 space-y-4 text-[17px]">
        <p>
          OurDealsHub shares curated products sold on Amazon. You don&apos;t need an account to
          use the site, and it collects very little. Here&apos;s exactly what and why.
        </p>

        <h2>When you open a paid link</h2>
        <p>
          Clicking &ldquo;View on Amazon&rdquo; records the time, the product, an optional
          campaign tag (such as <code>?src=fb</code>), your browser type and the page or site you
          came from (site name only). Your IP address isn&apos;t stored. Clicks are deleted after
          90 days and are used only to see which picks are popular. Amazon is told that the
          visit came from OurDealsHub (our site&apos;s address only, never the page or your
          search), as the Associates Program requires.
        </p>

        <h2>Stored on your device</h2>
        <p>
          Saved picks, your chosen store (All, US or UK) and your appearance setting are kept in
          your browser&apos;s local storage. They aren&apos;t sent to us, except that the Saved
          page asks the server for the current details of the picks you saved. Clearing your
          browser data removes them.
        </p>

        <h2>Cookies</h2>
        <p>
          The public site doesn&apos;t set cookies. Admin accounts use one sign-in cookie to stay
          signed in. Amazon sets its own cookies when you visit Amazon, including to credit
          OurDealsHub for qualifying purchases; see Amazon&apos;s privacy notice.
        </p>

        <h2>Service providers</h2>
        <p>
          Product information is fetched from Amazon. Admins may use Google Gemini to draft
          product write-ups; only Amazon&apos;s product details are sent, never visitor data.
        </p>

        <h2>Amazon Associates</h2>
        <p>
          OurDealsHub participates in the Amazon Services LLC Associates Program. See the{" "}
          <Link href="/disclosure">Affiliate Disclosure</Link>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy? Email <a href={`mailto:${email}`}>{email}</a> or use the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </div>
  );
}

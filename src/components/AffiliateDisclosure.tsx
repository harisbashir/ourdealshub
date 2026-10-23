import Link from "next/link";
import {
  AMAZON_ASSOCIATE_STATEMENT,
  LINK_LEVEL_DISCLOSURE,
} from "@/lib/affiliate-disclosure";

/** Directly above / beside primary Amazon CTAs (deal page). */
export function AffiliateLinkNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[11px] sm:text-xs text-muted leading-snug ${className}`}
    >
      <span className="font-medium text-foreground/80">
        {LINK_LEVEL_DISCLOSURE}
      </span>{" "}
      {AMAZON_ASSOCIATE_STATEMENT}{" "}
      <Link href="/disclosure" className="underline hover:text-brand">
        Details
      </Link>
    </p>
  );
}

/**
 * End-of-page disclosure (FatKid-style short block).
 * `compact` kept for API compat.
 */
export function AffiliateDisclosure({
  compact: _compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section className="site-container py-3 sm:py-4">
      <div className="rounded-lg border border-brand/25 bg-brand-soft px-3.5 py-3 sm:px-4 sm:py-3.5 text-center space-y-1.5">
        <p className="text-[11px] sm:text-xs text-foreground/90 leading-snug">
          <span className="font-semibold text-foreground">
            Affiliate Disclosure:
          </span>{" "}
          {AMAZON_ASSOCIATE_STATEMENT} Prices and availability are subject to
          change on Amazon.
        </p>
        <p className="text-[11px] sm:text-xs text-muted leading-snug">
          Outbound Amazon buttons are {LINK_LEVEL_DISCLOSURE} Special Links.{" "}
          <Link
            href="/disclosure"
            className="underline hover:text-brand font-medium text-brand"
          >
            Learn more
          </Link>
        </p>
      </div>
    </section>
  );
}

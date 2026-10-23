import Link from "next/link";
import { AMAZON_ASSOCIATE_STATEMENT } from "@/lib/affiliate-disclosure";

/**
 * One clear, legible disclosure near the top of every page that lists paid
 * links (FTC: clear and conspicuous, before people click). Each button also
 * carries a "Paid link" label.
 */
export function DisclosureNote({ className = "" }: { className?: string }) {
  return (
    <p className={`site-container pt-3 text-[13px] leading-snug text-muted ${className}`}>
      <span className="font-semibold text-foreground">Paid links.</span>{" "}
      {AMAZON_ASSOCIATE_STATEMENT}{" "}
      <Link href="/disclosure" className="font-medium text-brand underline-offset-2 hover:underline">
        How this works
      </Link>
    </p>
  );
}

/** Directly beside primary Amazon CTAs (deal page). */
export function AffiliateLinkNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[13px] leading-snug text-muted ${className}`}>
      <span className="font-semibold text-foreground">Paid link.</span>{" "}
      {AMAZON_ASSOCIATE_STATEMENT}{" "}
      <Link href="/disclosure" className="font-medium text-brand hover:underline">
        Details
      </Link>
    </p>
  );
}

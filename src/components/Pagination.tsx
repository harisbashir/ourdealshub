import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageHref } from "@/lib/pagination";

export function Pagination({
  basePath,
  page,
  totalPages,
  extraQuery,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  extraQuery?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const btn =
    "pressable inline-flex h-11 items-center gap-1 rounded-full px-4 text-[15px] font-semibold";

  return (
    <nav aria-label="Pages" className="site-container flex items-center justify-between gap-3 pt-8">
      {prev ? (
        <Link href={pageHref(basePath, prev, extraQuery)} className={`${btn} bg-card text-foreground ring-1 ring-border hover:bg-card-muted`}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
        </Link>
      ) : (
        <span className={`${btn} text-muted-fg`} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
        </span>
      )}
      <span className="text-[15px] tabular-nums text-muted">
        {page} of {totalPages}
      </span>
      {next ? (
        <Link href={pageHref(basePath, next, extraQuery)} className={`${btn} bg-card text-foreground ring-1 ring-border hover:bg-card-muted`}>
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={`${btn} text-muted-fg`} aria-disabled="true">
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}

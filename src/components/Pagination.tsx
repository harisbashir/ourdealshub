import Link from "next/link";
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

  return (
    <nav
      aria-label="Pagination"
      className="site-container pb-8 flex items-center justify-center gap-3"
    >
      {prev ? (
        <Link
          href={pageHref(basePath, prev, extraQuery)}
          className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:border-brand hover:text-brand transition-colors"
        >
          ← Previous
        </Link>
      ) : (
        <span className="rounded-lg border border-border px-3.5 py-2 text-sm text-muted-fg opacity-50">
          ← Previous
        </span>
      )}
      <span className="text-sm text-muted tabular-nums">
        Page {page} of {totalPages}
      </span>
      {next ? (
        <Link
          href={pageHref(basePath, next, extraQuery)}
          className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:border-brand hover:text-brand transition-colors"
        >
          Next →
        </Link>
      ) : (
        <span className="rounded-lg border border-border px-3.5 py-2 text-sm text-muted-fg opacity-50">
          Next →
        </span>
      )}
    </nav>
  );
}

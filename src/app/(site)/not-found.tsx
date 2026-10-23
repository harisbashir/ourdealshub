import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand">
        404
      </p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        That link may be old or mistyped. Browse deals or head home.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-dark"
        >
          Home
        </Link>
        <Link
          href="/deals/all"
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:border-brand hover:text-brand"
        >
          All deals
        </Link>
        <Link
          href="/search"
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:border-brand hover:text-brand"
        >
          Search
        </Link>
      </div>
    </div>
  );
}

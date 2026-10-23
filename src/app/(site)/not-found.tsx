import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-[15px] font-semibold text-brand">404</p>
      <h1 className="mt-1 text-[28px] font-bold tracking-tight text-foreground">Page Not Found</h1>
      <p className="mt-2 max-w-sm text-[15px] text-muted">
        The link may be old or mistyped. The pick may also have been removed from Amazon.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="pressable inline-flex h-11 items-center rounded-full bg-brand px-6 text-[15px] font-semibold text-on-brand hover:bg-brand-dark"
        >
          Go Home
        </Link>
        <Link
          href="/search"
          className="pressable inline-flex h-11 items-center rounded-full bg-card px-6 text-[15px] font-semibold text-foreground ring-1 ring-border hover:bg-card-muted"
        >
          Search Picks
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand">
        Error
      </p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Try again, or go back home. If this keeps happening, check back shortly.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-dark"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:border-brand hover:text-brand"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

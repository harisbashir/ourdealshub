/** Skeleton shown while a public page loads (HIG › Loading: show something right away). */
export default function SiteLoading() {
  return (
    <div className="site-container pt-7" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-card ring-1 ring-border-subtle" />
      <div className="mt-2 h-4 w-64 max-w-full animate-pulse rounded bg-card ring-1 ring-border-subtle" />
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border-subtle">
            <div className="aspect-square animate-pulse bg-card-muted" />
            <div className="space-y-2 p-3">
              <div className="h-3.5 animate-pulse rounded bg-card-muted" />
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-card-muted" />
              <div className="h-11 animate-pulse rounded-full bg-card-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

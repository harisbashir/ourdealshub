export default function SiteLoading() {
  return (
    <div className="site-container pt-8 pb-16 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-card-muted" />
      <div className="mt-2 h-4 w-72 max-w-full rounded bg-card-muted" />
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] rounded-2xl border border-border bg-card-muted"
          />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border overflow-hidden"
          >
            <div className="aspect-square bg-card-muted" />
            <div className="p-3 space-y-2">
              <div className="h-3 rounded bg-card-muted" />
              <div className="h-3 w-2/3 rounded bg-card-muted" />
              <div className="h-8 rounded-lg bg-card-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

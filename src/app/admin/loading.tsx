export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-4 p-1" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 rounded-lg bg-card-muted" />
      <div className="h-4 w-72 rounded bg-card-muted" />
      <div className="mt-6 space-y-2">
        <div className="h-12 rounded-xl bg-card-muted" />
        <div className="h-12 rounded-xl bg-card-muted" />
        <div className="h-12 rounded-xl bg-card-muted" />
        <div className="h-12 rounded-xl bg-card-muted" />
      </div>
    </div>
  );
}

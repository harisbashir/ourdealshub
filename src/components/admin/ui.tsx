/**
 * Shared admin UI primitives so every admin screen uses the same tokens,
 * sizes (44px controls) and type scale.
 */

export const inputClass =
  "w-full min-h-11 rounded-xl border border-field-border bg-input-bg px-3 py-2 text-[15px] text-foreground placeholder:text-muted-fg outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft";

export const labelClass = "block text-[15px] font-medium text-foreground";

export const hintClass = "mt-1 text-[13px] text-muted";

export const primaryButtonClass =
  "pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-dark disabled:opacity-50";

export const secondaryButtonClass =
  "pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-semibold text-foreground hover:bg-card-muted disabled:opacity-50";

export function AdminCard({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-border-subtle sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[19px] font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[15px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Status text with an icon-free shape cue (not colour alone). */
export function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neutral";
  children: React.ReactNode;
}) {
  const cls = {
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    neutral: "bg-card-muted text-muted",
  }[tone];
  const dot = {
    success: "●",
    warning: "▲",
    danger: "■",
    neutral: "○",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${cls}`}>
      <span aria-hidden className="text-xs">{dot}</span>
      {children}
    </span>
  );
}

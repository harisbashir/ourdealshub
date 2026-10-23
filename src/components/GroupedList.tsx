import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type GroupedRow = {
  href: string;
  label: string;
  detail?: string;
  icon?: React.ReactNode;
};

/** iOS-style inset grouped list of navigation rows (≥ 48px tall). */
export function GroupedList({ title, rows }: { title?: string; rows: GroupedRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="pt-6">
      {title && (
        <h2 className="px-4 pb-2 text-[13px] font-medium uppercase tracking-wide text-muted">
          {title}
        </h2>
      )}
      <ul className="divide-y divide-border-subtle overflow-hidden rounded-2xl bg-card ring-1 ring-border-subtle">
        {rows.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-[17px] text-foreground hover:bg-card-muted"
            >
              {r.icon && <span className="text-brand">{r.icon}</span>}
              <span className="min-w-0 flex-1 truncate">{r.label}</span>
              {r.detail && <span className="shrink-0 text-[15px] text-muted">{r.detail}</span>}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-fg" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

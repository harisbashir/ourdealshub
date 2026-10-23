import { ChevronRight } from "lucide-react";

export type HelpItem = { q: string; a: React.ReactNode };

/** Grouped, expandable Q&A rows (native <details>, keyboard + screen-reader friendly). */
export function HelpList({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: HelpItem[];
}) {
  return (
    <section id={id} className="scroll-mt-20 pt-6" aria-labelledby={`${id}-title`}>
      <h2
        id={`${id}-title`}
        className="px-4 pb-2 text-[13px] font-medium uppercase tracking-wide text-muted"
      >
        {title}
      </h2>
      <div className="divide-y divide-border-subtle overflow-hidden rounded-2xl bg-card ring-1 ring-border-subtle">
        {items.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex min-h-12 items-center gap-3 px-4 py-3 text-[17px] text-foreground hover:bg-card-muted">
              <span className="flex-1">{item.q}</span>
              <ChevronRight
                className="disclosure-chevron h-4 w-4 shrink-0 text-muted-fg transition-transform"
                aria-hidden
              />
            </summary>
            <div className="prose-page px-4 pb-4 text-[15px]">{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

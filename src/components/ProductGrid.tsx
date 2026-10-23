import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard, type ProductCardData } from "./ProductCard";
import { ScrollRow } from "./ScrollRow";

/**
 * A titled section of product cards — a swipeable row on the home page,
 * or a responsive grid on listing pages.
 */
export function ProductGrid({
  title,
  subtitle,
  products,
  viewAllHref,
  layout = "grid",
  headingLevel = 2,
  emptyText = "Nothing here yet. Check back soon.",
  priorityCount = 0,
  headerExtra,
}: {
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  viewAllHref?: string;
  layout?: "grid" | "carousel";
  headingLevel?: 1 | 2;
  emptyText?: string;
  /** Eager-load the first N images (above the fold) */
  priorityCount?: number;
  /** Rendered under the heading (e.g. subcategory chips) */
  headerExtra?: React.ReactNode;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section className="site-container pt-7 sm:pt-9" aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <Heading
            className={`${
              headingLevel === 1 ? "text-[28px] sm:text-[34px]" : "text-[22px] sm:text-2xl"
            } font-bold tracking-tight text-foreground`}
          >
            {title}
          </Heading>
          {subtitle && (
            <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>
          )}
        </div>
        {viewAllHref && products.length > 0 && (
          <Link
            href={viewAllHref}
            className="-mr-2 inline-flex h-11 shrink-0 items-center gap-0.5 rounded-full px-2 text-[15px] font-semibold text-brand hover:bg-brand-soft"
          >
            See All
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>

      {headerExtra && <div className="mb-4">{headerExtra}</div>}

      {products.length === 0 ? (
        <p className="rounded-2xl bg-card px-6 py-12 text-center text-[15px] text-muted ring-1 ring-border-subtle">
          {emptyText}
        </p>
      ) : layout === "carousel" ? (
        <ScrollRow label={title} itemClassName="w-[44vw] max-w-[13rem] sm:w-[12.5rem]">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < priorityCount} />
          ))}
        </ScrollRow>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {products.map((p, i) => (
            <li key={p.id} className="flex">
              <ProductCard product={p} priority={i < priorityCount} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

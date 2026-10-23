import { TrendingUp, Sparkles, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { ProductCard, ProductCardData } from "./ProductCard";
import { ScrollRow } from "./ScrollRow";

const ICONS = {
  trending: TrendingUp,
  sparkles: Sparkles,
  grid: LayoutGrid,
} as const;

export function ProductGrid({
  title,
  subtitle,
  products,
  viewAllHref,
  layout = "grid",
  icon = "trending",
}: {
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  viewAllHref?: string;
  layout?: "grid" | "carousel";
  icon?: keyof typeof ICONS;
}) {
  const Icon = ICONS[icon];

  return (
    <section className="site-container pt-5 sm:pt-8">
      <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-brand shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs sm:text-sm font-semibold text-brand hover:underline shrink-0"
          >
            See more →
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card py-10 text-center text-muted text-sm">
          {title === "Just Added"
            ? "No deals added today yet."
            : "No deals found."}
        </p>
      ) : layout === "carousel" ? (
        <ScrollRow itemClassName="w-[min(44vw,10.5rem)] sm:w-[178px] md:w-[186px] lg:w-[194px]">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ScrollRow>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-2.5 sm:gap-3 items-stretch">
          {products.map((p) => (
            <div key={p.id} className="h-full min-h-0 flex flex-col">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

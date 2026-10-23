"use client";

import Link from "next/link";
import { SafeProductImage } from "@/components/SafeProductImage";
import {
  marketplaceBadge,
  marketplaceLabel,
  marketplaceTagClass,
} from "@/lib/marketplace";
import {
  AMAZON_ASSOCIATE_STATEMENT,
  LINK_LEVEL_DISCLOSURE,
} from "@/lib/affiliate-disclosure";

export type ProductCardData = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  affiliateUrl: string;
  marketplace?: string | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const goUrl = `/go/${product.slug}`;
  const badge = marketplaceBadge(product.marketplace);
  const storeLabel = marketplaceLabel(product.marketplace);
  const tagClass = marketplaceTagClass(product.marketplace);

  return (
    <article className="product-card group flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-border shadow-sm will-change-transform">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-white/25">
        <span
          className={`absolute left-2 top-2 z-10 rounded-md border px-2.5 py-1.5 text-xs sm:text-sm font-black uppercase tracking-wider ${tagClass}`}
          title={storeLabel}
        >
          {badge}
        </span>
        <Link
          href={`/deal/${product.slug}`}
          className="absolute inset-0 block"
        >
          <SafeProductImage
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-contain p-2 sm:p-2.5 transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width:640px) 46vw, (max-width:1024px) 25vw, 16vw"
          />
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-white/40 p-2 sm:p-2.5">
        <p
          className={`mb-1 inline-flex w-fit rounded border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide ${
            product.marketplace === "UK"
              ? "border-sky-500/35 bg-sky-500/15 text-sky-700 dark:text-sky-300"
              : "border-brand/35 bg-brand-soft text-brand"
          }`}
        >
          {storeLabel}
        </p>
        <Link
          href={`/deal/${product.slug}`}
          className="mb-1.5 block min-h-[2.5rem] sm:min-h-[2.75rem] text-[12.5px] sm:text-[13px] font-semibold leading-[1.35] text-foreground transition-colors group-hover:text-brand"
        >
          <span className="line-clamp-2">{product.title}</span>
        </Link>

        <div className="mt-auto flex flex-col gap-1 sm:gap-1.5 relative z-10">
          <a
            href={goUrl}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="block w-full rounded-lg bg-brand py-1.5 text-center text-[11px] sm:text-xs font-bold tracking-wide text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md hover:shadow-brand/30"
          >
            View on Amazon
          </a>
          <p className="text-[8px] sm:text-[9px] text-muted-fg text-center leading-snug px-0.5">
            <span className="font-semibold text-foreground/80">
              {LINK_LEVEL_DISCLOSURE}
            </span>{" "}
            {AMAZON_ASSOCIATE_STATEMENT}
          </p>
          <Link
            href={`/deal/${product.slug}`}
            className="block w-full rounded-lg border border-border bg-card py-1.5 text-center text-[11px] sm:text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand hover:bg-card-muted"
          >
            More Details
          </Link>
        </div>
      </div>
    </article>
  );
}

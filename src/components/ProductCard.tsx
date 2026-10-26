import Link from "next/link";
import { SafeProductImage } from "@/components/SafeProductImage";
import { SaveButton } from "@/components/SaveButton";
import { marketplaceBadge, marketplaceLabel } from "@/lib/marketplace";
import { AFFILIATE_LINK_REL } from "@/lib/affiliate-disclosure";
import { DealSavings } from "@/components/DealSavings";
import type { DiscountData } from "@/lib/amazon-discounts";

export type ProductCardData = DiscountData & {
  isDemo?: boolean;
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  affiliateUrl: string;
  marketplace?: string | null;
};

/**
 * Product card: the photo sits on a white "shelf" tile (Amazon images have
 * white backgrounds), the title opens the details page, and one capsule
 * button goes to Amazon. Content stays opaque — no blur on cards.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  const detailsHref = `/deal/${product.slug}`;
  const store = marketplaceBadge(product.marketplace);

  return (
    <article className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)] ring-1 ring-border-subtle">
      <Link href={detailsHref} className="flex flex-col">
        <div className="shelf relative aspect-square w-full overflow-hidden">
          <SafeProductImage
            src={product.imageUrl}
            alt=""
            fill
            priority={priority}
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width:640px) 46vw, (max-width:1024px) 30vw, 220px"
          />
          <span
            className="absolute left-2 top-2 rounded-md bg-card px-1.5 py-0.5 text-xs font-semibold text-foreground ring-1 ring-border-subtle"
            title={marketplaceLabel(product.marketplace)}
          >
            {store}
          </span>
        </div>
        <h3 className="line-clamp-2 px-3 pt-2.5 text-[15px] font-semibold leading-snug text-foreground">
          {product.title}
        </h3>
      </Link>

      <SaveButton slug={product.slug} title={product.title} />

      <div className="px-3"><DealSavings product={product} /></div>
      <div className="mt-auto px-3 pb-3 pt-2.5">
        <a
          href={product.isDemo ? detailsHref : `/go/${product.slug}`}
          target={product.isDemo ? undefined : "_blank"}
          rel={AFFILIATE_LINK_REL}
          aria-label={product.isDemo ? `Preview deal: ${product.title} (sample only)` : `Get deal on Amazon: ${product.title} (paid link, opens in a new tab)`}
          className="pressable flex min-h-11 w-full items-center justify-center rounded-full bg-brand px-2 py-2 text-center text-[15px] font-semibold leading-snug text-on-brand hover:bg-brand-dark"
        >
          {product.isDemo ? "Preview deal" : "Get deal on Amazon"}
        </a>
        <p className="mt-1.5 text-center text-xs text-muted-fg">{product.isDemo ? "Sample · preview only" : "Paid link"}</p>
      </div>
    </article>
  );
}

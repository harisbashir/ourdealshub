"use client";

import { useEffect, useState } from "react";
import { sampleSavings, visibleDiscount, type DiscountData } from "@/lib/amazon-discounts";
import { marketplaceLabel } from "@/lib/marketplace";

/** Also expires in an already-open tab, including cards loaded from Saved. */
export function DealSavings({ product }: { product: DiscountData & { isDemo?: boolean; slug: string; marketplace?: string | null } }) {
  const [, update] = useState(0);
  useEffect(() => {
    if (product.isDemo || !product.discountExpiresAt || !product.discountFetchedAt) return;
    const expires = Math.min(new Date(product.discountExpiresAt).getTime(), new Date(product.discountFetchedAt).getTime() + 86400_000);
    if (!Number.isFinite(expires)) return;
    const timer = setTimeout(() => update((value) => value + 1), Math.max(0, expires - Date.now()) + 25);
    return () => clearTimeout(timer);
  }, [product.isDemo, product.discountExpiresAt, product.discountFetchedAt]);
  const percent = product.isDemo ? sampleSavings(product.slug) : visibleDiscount(product);
  if (!percent) return null;
  const checked = product.discountFetchedAt ? new Date(product.discountFetchedAt) : null;
  return <div className="mt-3 space-y-1.5" data-deal-savings>
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex rounded-lg bg-brand-soft px-2.5 py-1 text-[22px] font-bold leading-tight tracking-tight text-brand">{percent}% off</span>
      {product.isDemo && <span className="text-xs font-medium text-muted">Sample savings</span>}
    </div>
    {product.isDemo ? <p className="text-xs leading-relaxed text-muted">Illustrative discount · preview only</p> : <>
      <p className="text-xs leading-relaxed text-muted">vs. {product.discountBasis}</p>
      <details className="text-xs leading-relaxed text-muted">
        <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:rounded focus-visible:outline-2 focus-visible:outline-brand">
          As of <time dateTime={checked!.toISOString()}>{checked!.toISOString().slice(0, 16).replace("T", " ")} UTC</time> · Details
        </summary>
        <p className="pb-2">Product prices and availability are accurate as of the date/time indicated and are subject to change. Any price and availability information displayed on {marketplaceLabel(product.marketplace)} at the time of purchase will apply to the purchase of this product.</p>
      </details>
    </>}
  </div>;
}

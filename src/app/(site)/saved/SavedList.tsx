"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { removeSaved, useSavedSlugs } from "@/lib/saved";

export function SavedList() {
  const slugs = useSavedSlugs();
  const [products, setProducts] = useState<ProductCardData[] | null>(null);
  const key = slugs.join(",");

  useEffect(() => {
    if (!key) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/saved?slugs=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((data: { products: ProductCardData[] }) => {
        if (cancelled) return;
        setProducts(data.products);
        // Forget picks that are no longer on the site
        const live = new Set(data.products.map((p) => p.slug));
        removeSaved(key.split(",").filter((s) => !live.has(s)));
      })
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (products === null) {
    return (
      <ul className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" aria-busy="true">
        {Array.from({ length: Math.min(Math.max(slugs.length, 2), 10) }).map((_, i) => (
          <li key={i} className="aspect-[3/4.4] animate-pulse rounded-2xl bg-card ring-1 ring-border-subtle" />
        ))}
      </ul>
    );
  }

  if (!products.length) {
    return (
      <div className="mt-6 rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-border-subtle">
        <Heart className="mx-auto h-10 w-10 text-muted-fg" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold text-foreground">No saved picks yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted">
          Tap the heart on any product to keep it here. Saved picks stay on this device.
        </p>
        <Link
          href="/"
          className="pressable mt-6 inline-flex h-11 items-center rounded-full bg-brand px-6 text-[15px] font-semibold text-on-brand hover:bg-brand-dark"
        >
          Find Picks
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <li key={p.id} className="flex">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

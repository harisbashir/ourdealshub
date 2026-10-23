"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export type AdminFilterOption = { id: string; name: string };

export function AdminProductFilter({
  admins,
}: {
  admins: AdminFilterOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("admin") || "";
  const archived = params.get("archived") === "1";
  const market = (params.get("market") || "").toUpperCase();
  const [q, setQ] = useState(params.get("q") || "");

  function push(next: URLSearchParams) {
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `/admin/products?${qs}` : "/admin/products");
  }

  function onAdminChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("admin", value);
    else next.delete("admin");
    push(next);
  }

  function onMarketChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("market", value);
    else next.delete("market");
    push(next);
  }

  function onArchivedToggle() {
    const next = new URLSearchParams(params.toString());
    if (archived) next.delete("archived");
    else next.set("archived", "1");
    push(next);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    const trimmed = q.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    push(next);
  }

  const field =
    "min-h-11 rounded-xl border border-field-border bg-input-bg px-3 text-[15px] text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <form onSubmit={onSearch} role="search" className="flex min-w-0 flex-1 gap-2 sm:max-w-sm">
        <label htmlFor="product-search" className="sr-only">Search products</label>
        <input
          id="product-search"
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title or ASIN"
          className={`${field} min-w-0 flex-1 placeholder:text-muted-fg`}
        />
        <button
          type="submit"
          className="pressable min-h-11 rounded-full border border-border bg-card px-4 text-[15px] font-semibold text-foreground hover:bg-card-muted"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <label htmlFor="market-filter" className="sr-only">Store</label>
        <select
          id="market-filter"
          value={market === "US" || market === "UK" ? market : ""}
          onChange={(e) => onMarketChange(e.target.value)}
          className={field}
        >
          <option value="">All stores</option>
          <option value="US">US store</option>
          <option value="UK">UK store</option>
        </select>

        {admins.length > 0 && (
          <>
            <label htmlFor="admin-filter" className="sr-only">Added by</label>
            <select
              id="admin-filter"
              value={selected}
              onChange={(e) => onAdminChange(e.target.value)}
              className={field}
            >
              <option value="">Everyone</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.id}
                </option>
              ))}
            </select>
          </>
        )}

        <button
          type="button"
          onClick={onArchivedToggle}
          aria-pressed={archived}
          className={`pressable min-h-11 rounded-full px-4 text-[15px] font-semibold ring-1 ${
            archived
              ? "bg-foreground text-background ring-foreground"
              : "bg-card text-foreground ring-border hover:bg-card-muted"
          }`}
        >
          Archived
        </button>
      </div>
    </div>
  );
}

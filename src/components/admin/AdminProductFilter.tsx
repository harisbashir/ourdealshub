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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <form onSubmit={onSearch} className="flex items-center gap-1.5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, ASIN…"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand w-44 placeholder:text-muted-fg"
        />
        <button
          type="submit"
          className="admin-edge-btn rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
        >
          Search
        </button>
      </form>

      <label htmlFor="market-filter" className="text-sm text-muted shrink-0">
        Store
      </label>
      <select
        id="market-filter"
        value={market === "US" || market === "UK" ? market : ""}
        onChange={(e) => onMarketChange(e.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand min-w-[100px]"
      >
        <option value="">All</option>
        <option value="US">US</option>
        <option value="UK">UK</option>
      </select>

      {admins.length > 0 && (
        <>
          <label htmlFor="admin-filter" className="text-sm text-muted shrink-0">
            Added by
          </label>
          <select
            id="admin-filter"
            value={selected}
            onChange={(e) => onAdminChange(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand min-w-[140px]"
          >
            <option value="">All admins</option>
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
        className={`admin-edge-btn rounded-lg border px-3 py-2 text-sm transition-colors ${
          archived
            ? "border-brand text-brand font-semibold"
            : "border-border bg-card text-foreground"
        }`}
      >
        {archived ? "Viewing archived" : "Archived"}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Pencil,
  Trash2,
  Copy,
  Check,
  ArchiveRestore,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import {
  bulkPublishProducts,
  deleteProduct,
  permanentlyDeleteProduct,
  restoreProduct,
  refreshProductFromAmazon,
} from "@/lib/admin-actions";

export type AdminProductRow = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  affiliateUrl: string;
  marketplace: string;
  isPublished: boolean;
  isTrending: boolean;
  createdAt: string;
  categoryName: string;
  createdByName: string | null;
  clickCount: number;
  deletedAt: string | null;
  expiresAt: string | null;
  asin: string | null;
  scheduledAt?: string | null;
  linkStatus?: string | null;
};

export function ProductTable({
  products,
  siteUrl,
  archived,
}: {
  products: AdminProductRow[];
  siteUrl: string;
  archived?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [bulkMsg, setBulkMsg] = useState("");

  const draftIds = useMemo(
    () => products.filter((p) => !p.isPublished && !p.deletedAt).map((p) => p.id),
    [products]
  );

  const allDraftsSelected =
    draftIds.length > 0 && draftIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllDrafts() {
    setSelected((prev) => {
      if (allDraftsSelected) {
        const next = new Set(prev);
        draftIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      draftIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function onBulkPublish() {
    const ids = [...selected].filter((id) => draftIds.includes(id));
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Publish ${ids.length} draft${ids.length === 1 ? "" : "s"} now? Connected social channels may auto-post.`
    );
    if (!ok) return;
    setBulkMsg("");
    startTransition(async () => {
      const res = await bulkPublishProducts(ids);
      setBulkMsg(
        res.ok
          ? `Published ${res.count} deal${res.count === 1 ? "" : "s"}.`
          : "Bulk publish failed."
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {!archived && draftIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-border-subtle">
          <label className="inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-foreground">
            <input
              type="checkbox"
              checked={allDraftsSelected}
              onChange={toggleAllDrafts}
              className="h-5 w-5"
            />
            Select drafts ({draftIds.length})
          </label>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={onBulkPublish}
            className="pressable inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-dark disabled:opacity-50"
          >
            {pending
              ? "Publishing…"
              : `Publish Selected (${[...selected].filter((id) => draftIds.includes(id)).length})`}
          </button>
          {bulkMsg && (
            <span role="status" className="text-[15px] font-medium text-success">{bulkMsg}</span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)] ring-1 ring-border-subtle">
        <div className="hidden grid-cols-[2rem_minmax(0,1fr)_7.5rem_4.5rem_6.5rem_auto] items-center gap-x-3 border-b border-border-subtle bg-card-muted px-4 py-2.5 text-[13px] font-medium text-muted md:grid">
          <span aria-hidden />
          <span>Product</span>
          <span>Status</span>
          <span className="text-right">Clicks</span>
          <span>Added</span>
          <span className="text-right">Actions</span>
        </div>
        <ul className="divide-y divide-border-subtle">
          {products.map((p) => (
            <ProductSubCard
              key={p.id}
              product={p}
              siteUrl={siteUrl}
              archived={archived}
              selectable={!archived && !p.isPublished}
              selected={selected.has(p.id)}
              onToggle={() => toggle(p.id)}
            />
          ))}
        </ul>

        {products.length === 0 && (
          <p className="p-8 text-center text-[15px] text-muted">
            {archived
              ? "No archived products."
              : "No products yet. Use Add Deal to create the first one."}
          </p>
        )}
      </div>
    </div>
  );
}

function ProductSubCard({
  product: p,
  siteUrl,
  archived,
  selectable,
  selected,
  onToggle,
}: {
  product: AdminProductRow;
  siteUrl: string;
  archived?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [syncMsg, setSyncMsg] = useState("");
  const dealUrl = `${siteUrl.replace(/\/$/, "")}/deal/${p.slug}`;
  const expired =
    p.expiresAt && new Date(p.expiresAt).getTime() < Date.now();
  const scheduled =
    !p.isPublished &&
    p.scheduledAt &&
    new Date(p.scheduledAt).getTime() > Date.now();

  async function copyDealUrl() {
    try {
      await navigator.clipboard.writeText(dealUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  function onArchive() {
    const ok = window.confirm(
      `Archive “${p.title}”? It will be hidden from the storefront.`
    );
    if (!ok) return;
    startTransition(async () => {
      await deleteProduct(p.id);
      router.refresh();
    });
  }

  function onRestore() {
    startTransition(async () => {
      await restoreProduct(p.id);
      router.refresh();
    });
  }

  function onHardDelete() {
    const ok = window.confirm(
      `Permanently delete “${p.title}”? This cannot be undone.`
    );
    if (!ok) return;
    startTransition(async () => {
      await permanentlyDeleteProduct(p.id);
      router.refresh();
    });
  }

  function onSync() {
    setSyncMsg("");
    startTransition(async () => {
      const res = await refreshProductFromAmazon(p.id);
      setSyncMsg(res.message);
      if (res.ok) router.refresh();
    });
  }

  const iconBtn =
    "pressable inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-card-muted hover:text-foreground disabled:opacity-50";

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[2rem_minmax(0,1fr)_7.5rem_4.5rem_6.5rem_auto] md:items-center">
      <div className="row-span-2 pt-1 md:row-span-1 md:pt-0">
        {selectable ? (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggle}
            className="h-5 w-5"
            aria-label={`Select ${p.title}`}
          />
        ) : (
          <span className="block w-5" aria-hidden />
        )}
      </div>

      <div className="flex min-w-0 items-start gap-3">
        <div className="shelf relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-border-subtle">
          <Image src={p.imageUrl} alt="" fill className="object-contain p-1" unoptimized />
        </div>
        <div className="min-w-0">
          <Link
            href={`/admin/products/${p.id}/edit`}
            className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground hover:underline"
          >
            {p.title}
          </Link>
          <p className="mt-0.5 text-[13px] text-muted">
            <span title={p.marketplace === "UK" ? "Amazon.co.uk" : "Amazon.com"}>
              {p.marketplace === "UK" ? "UK" : "US"}
            </span>
            {" · "}
            {p.categoryName}
            {p.createdByName ? ` · ${p.createdByName}` : ""}
          </p>
          {p.linkStatus === "broken" && (
            <p className="mt-0.5 text-[13px] font-semibold text-danger">
              Link flagged as broken
            </p>
          )}
          {syncMsg && (
            <p role="status" className="mt-0.5 text-[13px] text-muted">{syncMsg}</p>
          )}
        </div>
      </div>

      <div className="col-start-2 flex flex-wrap items-center gap-1.5 md:col-start-auto">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[13px] font-medium ${
            p.isPublished ? "bg-success-soft text-success" : "bg-card-muted text-muted"
          }`}
        >
          {p.isPublished ? "Published" : "Draft"}
        </span>
        {scheduled && (
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[13px] font-medium text-brand">
            Scheduled
          </span>
        )}
        {p.isTrending && (
          <span className="rounded-full bg-card-muted px-2.5 py-0.5 text-[13px] font-medium text-foreground">
            Pinned
          </span>
        )}
        {expired && (
          <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-[13px] font-medium text-warning">
            Expired
          </span>
        )}
        <span className="text-[13px] text-muted md:hidden">
          · {p.clickCount} {p.clickCount === 1 ? "click" : "clicks"} ·{" "}
          {new Date(p.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="hidden text-right text-[15px] tabular-nums text-muted md:block">
        {p.clickCount}
      </div>
      <div className="hidden text-[15px] text-muted md:block">
        {new Date(p.createdAt).toLocaleDateString()}
      </div>

      <div className="col-start-2 -ml-2.5 flex items-center gap-0.5 md:col-start-auto md:ml-0 md:justify-end">
        {!archived && (
          <>
            <Link href={`/admin/products/${p.id}/edit`} className={iconBtn} aria-label={`Edit ${p.title}`} title="Edit">
              <Pencil className="h-[18px] w-[18px]" aria-hidden />
            </Link>
            <button type="button" onClick={copyDealUrl} className={iconBtn} aria-label="Copy page link" title="Copy page link">
              {copied ? <Check className="h-[18px] w-[18px] text-success" aria-hidden /> : <Copy className="h-[18px] w-[18px]" aria-hidden />}
              <span className="sr-only" aria-live="polite">{copied ? "Copied" : ""}</span>
            </button>
            <Link href={`/admin/analytics/product/${p.id}`} className={iconBtn} aria-label="Click analytics" title="Click analytics">
              <BarChart3 className="h-[18px] w-[18px]" aria-hidden />
            </Link>
            {(p.asin || p.affiliateUrl.includes("amazon.")) && (
              <button type="button" disabled={pending} onClick={onSync} className={iconBtn} aria-label="Refresh from Amazon" title="Refresh from Amazon">
                <RefreshCw className={`h-[18px] w-[18px] ${pending ? "animate-spin" : ""}`} aria-hidden />
              </button>
            )}
            <button type="button" disabled={pending} onClick={onArchive} className={`${iconBtn} hover:text-danger`} aria-label={`Archive ${p.title}`} title="Archive">
              <Trash2 className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </>
        )}
        {archived && (
          <>
            <button type="button" disabled={pending} onClick={onRestore} className={`${iconBtn} hover:text-success`} aria-label={`Restore ${p.title}`} title="Restore">
              <ArchiveRestore className="h-[18px] w-[18px]" aria-hidden />
            </button>
            <button type="button" disabled={pending} onClick={onHardDelete} className={`${iconBtn} hover:text-danger`} aria-label={`Delete ${p.title} permanently`} title="Delete permanently">
              <Trash2 className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

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
import { AdminHScroll } from "@/components/admin/AdminHScroll";

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
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm admin-shell-static">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={allDraftsSelected}
              onChange={toggleAllDrafts}
              className="rounded border-border text-brand focus:ring-brand"
            />
            Select drafts ({draftIds.length})
          </label>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={onBulkPublish}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {pending
              ? "Publishing…"
              : `Publish selected (${[...selected].filter((id) => draftIds.includes(id)).length})`}
          </button>
          {bulkMsg && (
            <span className="text-xs text-emerald-600 font-medium">{bulkMsg}</span>
          )}
        </div>
      )}

      {/* Main card — no hover edge; sub-cards highlight individually */}
      <div className="admin-shell-static rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <AdminHScroll>
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[auto_minmax(200px,1.4fr)_auto_auto_auto_auto_auto_auto] gap-x-2 items-center bg-card-muted text-left text-muted text-sm px-3 py-2.5 border-b border-border">
              {!archived ? (
                <span className="w-8" aria-hidden />
              ) : (
                <span className="w-0" aria-hidden />
              )}
              <span className="px-1 font-medium">Product</span>
              <span className="px-1 font-medium">Copy URL</span>
              <span className="px-1 font-medium">Status</span>
              <span className="px-1 font-medium">Clicks</span>
              <span className="px-1 font-medium">Added</span>
              <span className="px-1 font-medium">By</span>
              <span className="px-1 font-medium">Actions</span>
            </div>

            <div className="space-y-2 p-2.5">
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
            </div>
          </div>
        </AdminHScroll>

        {products.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            {archived ? "No archived products." : "No products yet."}
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

  return (
    <article className="admin-deal-card grid grid-cols-[auto_minmax(200px,1.4fr)_auto_auto_auto_auto_auto_auto] gap-x-2 items-start rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
      {!archived ? (
        <div className="w-8 pt-4">
          {selectable ? (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onToggle}
              className="rounded border-border text-brand focus:ring-brand"
              aria-label={`Select ${p.title}`}
            />
          ) : null}
        </div>
      ) : (
        <span className="w-0" aria-hidden />
      )}

      <div className="flex gap-2.5 min-w-0 px-1 items-start">
            <span
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide leading-none ${
                p.marketplace === "UK"
                  ? "border-sky-500/50 bg-sky-500 text-white"
                  : "border-brand/50 bg-brand text-white"
              }`}
              title={
                p.marketplace === "UK"
                  ? "Amazon.co.uk (UK)"
                  : "Amazon.com (US)"
              }
            >
              {p.marketplace === "UK" ? "UK" : "US"}
            </span>
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-card-muted border border-border">
          <Image
            src={p.imageUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground line-clamp-2">{p.title}</p>
          <p className="text-xs text-muted mt-0.5">{p.categoryName}</p>
          {p.linkStatus === "broken" && (
            <p className="text-[10px] font-semibold text-red-500 mt-0.5">
              Link flagged broken
            </p>
          )}
          {syncMsg && (
            <p className="text-xs text-muted-fg mt-0.5">{syncMsg}</p>
          )}
        </div>
      </div>

      <div className="px-1 pt-1">
        <button
          type="button"
          title="Copy deal page URL"
          onClick={copyDealUrl}
          className="admin-edge-btn inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy URL
            </>
          )}
        </button>
      </div>

      <div className="px-1 pt-1.5 whitespace-nowrap">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            p.isPublished
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-card-muted text-muted"
          }`}
        >
          {p.isPublished ? "Published" : "Draft"}
        </span>
        {scheduled && (
          <span className="ml-1 rounded bg-brand-soft text-brand text-xs px-1.5 py-0.5 font-medium">
            Scheduled
          </span>
        )}
        {p.isTrending && (
          <span className="ml-1 rounded bg-red-500/15 text-red-600 text-xs px-1.5 py-0.5">
            Pinned
          </span>
        )}
        {expired && (
          <span className="ml-1 rounded bg-amber-500/15 text-amber-600 text-xs px-1.5 py-0.5">
            Expired
          </span>
        )}
      </div>

      <div className="px-1 pt-1.5 text-muted tabular-nums">{p.clickCount}</div>
      <div className="px-1 pt-1.5 text-muted whitespace-nowrap">
        {new Date(p.createdAt).toLocaleDateString()}
      </div>
      <div className="px-1 pt-1.5 text-muted text-xs max-w-[100px] truncate">
        {p.createdByName || "—"}
      </div>

      <div className="px-1 pt-0.5 flex items-center gap-1">
        {!archived && (
          <>
            <Link
              href={`/admin/analytics/product/${p.id}`}
              className="admin-icon-btn rounded p-1.5 text-muted"
              title="Click analytics"
            >
              <BarChart3 className="h-4 w-4" />
            </Link>
            {(p.asin || p.affiliateUrl.includes("amazon.")) && (
              <button
                type="button"
                title="Refresh from Amazon"
                disabled={pending}
                onClick={onSync}
                className="admin-icon-btn rounded p-1.5 text-muted disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${pending ? "animate-spin" : ""}`}
                />
              </button>
            )}
            <Link
              href={`/admin/products/${p.id}/edit`}
              className="admin-icon-btn rounded p-1.5 text-muted"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button
              type="button"
              title="Archive"
              disabled={pending}
              onClick={onArchive}
              className="admin-icon-btn admin-icon-btn--danger rounded p-1.5 text-muted"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        {archived && (
          <>
            <button
              type="button"
              title="Restore"
              disabled={pending}
              onClick={onRestore}
              className="admin-icon-btn admin-icon-btn--ok rounded p-1.5 text-muted"
            >
              <ArchiveRestore className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Delete forever"
              disabled={pending}
              onClick={onHardDelete}
              className="admin-icon-btn admin-icon-btn--danger rounded p-1.5 text-muted"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

"use client";

import { FormEvent, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  importProductFromUrl,
  publishImportedProduct,
  type ImportPreview,
  type ImportStep,
} from "@/lib/import-product";
import { detectMarketplaceFromInput } from "@/lib/marketplace";

type CategoryOption = { id: string; name: string };

export function QuickAddProduct({
  categories,
  amazonConfigured,
  geminiConfigured,
  autoPublish,
  hasTrackingId,
  trackingIdLabel,
  hasTrackingIdUk = false,
  trackingIdLabelUk = null,
  isSuperAdminUser = false,
}: {
  categories: CategoryOption[];
  amazonConfigured: boolean;
  geminiConfigured: boolean;
  autoPublish: boolean;
  hasTrackingId: boolean;
  trackingIdLabel: string | null;
  hasTrackingIdUk?: boolean;
  trackingIdLabelUk?: string | null;
  isSuperAdminUser?: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [marketplace, setMarketplace] = useState<"US" | "UK">("US");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [steps, setSteps] = useState<ImportStep[]>([]);

  const activeHasTracking =
    marketplace === "UK" ? hasTrackingIdUk : hasTrackingId;
  const activeTrackingLabel =
    marketplace === "UK" ? trackingIdLabelUk : trackingIdLabel;

  function onUrlChange(value: string) {
    setUrl(value);
    const detected = detectMarketplaceFromInput(value);
    if (detected) setMarketplace(detected);
  }

  function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFailures([]);
    setMessage("");
    setSteps([
      { id: "url", label: "URL / ASIN received", status: "done" },
      { id: "asin", label: "ASIN identified", status: "pending" },
      { id: "amazon", label: "Amazon data retrieved", status: "pending" },
      { id: "image", label: "Product image retrieved", status: "pending" },
      { id: "affiliate", label: "Affiliate link generated", status: "pending" },
      { id: "gemini", label: "Gemini content generated", status: "pending" },
      { id: "saved", label: "Product saved", status: "pending" },
      { id: "published", label: "Product published", status: "pending" },
    ]);
    startTransition(async () => {
      const res = await importProductFromUrl(url, marketplace);
      setSteps(res.steps || []);
      if (!res.ok) {
        setError(res.error);
        setFailures(res.failures || []);
        const missingTag =
          res.error.includes("Tracking ID") ||
          (res.failures || []).some((f) => f.includes("Tracking ID"));
        if (res.partial && !missingTag) {
          setPreview({
            asin: res.partial.asin || "",
            title: res.partial.title || "",
            description: res.partial.description || "",
            imageUrl: res.partial.imageUrl || "",
            affiliateUrl: res.partial.affiliateUrl || url,
            trackingId: res.partial.trackingId || activeTrackingLabel || "",
            dealPost: res.partial.dealPost || "",
            categoryId:
              res.partial.categoryId || categories[0]?.id || "",
            categoryLabel: res.partial.categoryLabel || "",
            marketplace: (res.partial.marketplace as "US" | "UK") || marketplace,
            existingProductId: res.partial.existingProductId || null,
          });
          setShowManual(true);
        }
        return;
      }
      if (res.mode === "published") {
        setMessage(res.message);
        router.push("/admin/products");
        router.refresh();
        return;
      }
      setPreview(res.preview);
      setMessage(res.message);
      setShowManual(false);
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl bg-card border border-border p-5 sm:p-6 space-y-4 shadow-sm">
        <div>
          <h2 className="font-semibold text-foreground">
            Add product from URL or ASIN
          </h2>
          <p className="text-sm text-muted mt-1">
            Choose the Amazon country, then paste a product URL or ASIN. The
            matching Tracking ID is applied on the server. We fetch product
            data, set category, run Gemini, then{" "}
            {autoPublish
              ? "publish automatically"
              : "show a preview for review"}
            .
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Country / marketplace
          </label>
          <div className="inline-flex rounded-lg border border-border bg-card-muted p-1 text-sm">
            {(["US", "UK"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setMarketplace(code)}
                className={`rounded-md px-3.5 py-1.5 font-medium transition-colors ${
                  marketplace === code
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted hover:text-brand"
                }`}
              >
                {code === "US" ? "Amazon.com (US)" : "Amazon.co.uk (UK)"}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            UK deals need a UK Tracking ID on your admin profile. Pasting an
            amazon.co.uk link auto-selects UK.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <StatusPill ok={amazonConfigured} label="Amazon API" />
          <StatusPill ok={geminiConfigured} label="Gemini API" />
          <StatusPill
            ok={activeHasTracking}
            label={
              activeHasTracking
                ? `${marketplace} Tracking: ${activeTrackingLabel}`
                : `${marketplace} Tracking ID missing`
            }
          />
          <StatusPill
            ok={autoPublish}
            label={autoPublish ? "Auto publish ON" : "Review mode"}
            neutral={!autoPublish}
          />
        </div>

        {!activeHasTracking && (
          <div className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning dark:text-warning">
            {isSuperAdminUser ? (
              <>
                Your {marketplace} Amazon Tracking ID is not set. Add it under{" "}
                <a href="/admin/admins" className="font-semibold underline">
                  Admins → Edit
                </a>{" "}
                before importing {marketplace} deals.
              </>
            ) : (
              <>
                Your {marketplace} Amazon Tracking ID has not been configured.
                Ask a Super Admin to set it on your account under Admins.
              </>
            )}
          </div>
        )}

        <form onSubmit={onAdd} className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Product URL or ASIN
          </label>
          <input
            type="text"
            required
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={
              marketplace === "UK"
                ? "https://www.amazon.co.uk/dp/B0XXXXXXXX  or  B0XXXXXXXX"
                : "https://www.amazon.com/dp/B0XXXXXXXX  or  B0XXXXXXXX"
            }
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono placeholder:text-muted-fg"
          />
          <button
            type="submit"
            disabled={pending || !url.trim() || !activeHasTracking}
            className="w-full sm:w-auto rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-on-brand hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Working…" : "Add Product"}
          </button>
        </form>

        {(pending || steps.length > 0) && (
          <ImportStepsList steps={steps} working={pending} />
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            <p className="font-medium">{error}</p>
            {failures.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-xs">
                {failures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
            {(error.includes("already exists") ||
              error.includes("already added") ||
              showManual) && (
              <button
                type="button"
                className="mt-2 text-xs font-semibold underline"
                onClick={() => setShowManual(true)}
              >
                Fill missing fields manually / update existing
              </button>
            )}
          </div>
        )}
        {message && !error && (
          <p className="text-sm text-success bg-success-soft border border-success/30 rounded-lg px-3 py-2">
            {message}
          </p>
        )}
      </div>

      {preview && (showManual || !autoPublish || preview.existingProductId) && (
        <ReviewForm
          preview={preview}
          categories={categories}
          onCancel={() => {
            setPreview(null);
            setShowManual(false);
            setError("");
            setFailures([]);
          }}
        />
      )}
    </div>
  );
}

function ImportStepsList({
  steps,
  working,
}: {
  steps: ImportStep[];
  working: boolean;
}) {
  if (!steps.length && !working) return null;
  return (
    <ul className="rounded-lg border border-border bg-card-muted px-3 py-2.5 text-xs space-y-1.5">
      {steps.map((s) => {
        const icon =
          s.status === "done"
            ? "✓"
            : s.status === "failed"
              ? "✕"
              : s.status === "skipped"
                ? "–"
                : working
                  ? "…"
                  : "○";
        const color =
          s.status === "done"
            ? "text-success"
            : s.status === "failed"
              ? "text-danger"
              : s.status === "skipped"
                ? "text-muted-fg"
                : "text-muted";
        return (
          <li key={s.id} className={`flex gap-2 ${color}`}>
            <span className="w-3 shrink-0 font-semibold">{icon}</span>
            <span>{s.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function StatusPill({
  ok,
  label,
  neutral,
}: {
  ok: boolean;
  label: string;
  neutral?: boolean;
}) {
  const cls = neutral
    ? "bg-warning-soft text-warning border-warning/30 dark:text-warning"
    : ok
      ? "bg-success-soft text-success border-success/30 dark:text-success"
      : "bg-card-muted text-muted border-border";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 font-medium ${cls}`}>
      {label}
    </span>
  );
}

function ReviewForm({
  preview,
  categories,
  onCancel,
}: {
  preview: ImportPreview;
  categories: CategoryOption[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const [values, setValues] = useState({
    title: preview.title,
    description: preview.description,
    dealPost: preview.dealPost,
    imageUrl: preview.imageUrl,
    affiliateUrl: preview.affiliateUrl,
    asin: preview.asin,
    categoryId: preview.categoryId || categories[0]?.id || "",
    marketplace: preview.marketplace || "US",
    existingProductId: preview.existingProductId,
  });

  const categoryHint =
    preview.categoryLabel ||
    categories.find((c) => c.id === values.categoryId)?.name ||
    "";

  function onPublish(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFailures([]);
    startTransition(async () => {
      const res = await publishImportedProduct(values);
      if (!res.ok) {
        setError(res.error);
        setFailures(res.failures || []);
        if (res.partial?.existingProductId) {
          setValues((v) => ({
            ...v,
            existingProductId: res.partial?.existingProductId || null,
          }));
        }
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onPublish}
      className="rounded-xl bg-card border border-border p-5 sm:p-6 space-y-4 shadow-sm"
    >
      <div>
        <h2 className="font-semibold text-foreground">
          {values.existingProductId
            ? "Update existing product"
            : "Review before publish"}
        </h2>
        <p className="text-sm text-muted mt-1">
          Edit the deal post or fill any missing fields, then publish. Image
          stays as the Amazon URL (not downloaded).
          {categoryHint ? (
            <>
              {" "}
              Category from Amazon:{" "}
              <span className="font-medium text-foreground">{categoryHint}</span>
            </>
          ) : null}
        </p>
      </div>

      {(values.imageUrl || values.title) && (
        <div className="flex gap-4 rounded-lg border border-border bg-card-muted p-3">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-card border border-border">
            {values.imageUrl ? (
              <Image
                src={values.imageUrl}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground line-clamp-2">
              {values.title || "Product title"}
            </p>
            {values.asin && (
              <p className="text-xs text-muted mt-1">ASIN: {values.asin}</p>
            )}
            <p className="text-xs text-muted mt-0.5">
              Store:{" "}
              <span className="font-semibold text-foreground">
                {values.marketplace === "UK"
                  ? "Amazon.co.uk (UK)"
                  : "Amazon.com (US)"}
              </span>
            </p>
            {preview.trackingId && (
              <p className="text-xs text-muted mt-0.5">
                Tracking ID:{" "}
                <span className="font-mono">{preview.trackingId}</span>
              </p>
            )}
          </div>
        </div>
      )}

      <Field
        label="Product title"
        value={values.title}
        onChange={(v) => setValues((s) => ({ ...s, title: v }))}
        required
      />
      <Area
        label="Product description (from Amazon)"
        value={values.description}
        onChange={(v) => setValues((s) => ({ ...s, description: v }))}
        rows={4}
      />
      <Area
        label="Deal post (Gemini)"
        value={values.dealPost}
        onChange={(v) => setValues((s) => ({ ...s, dealPost: v }))}
        rows={8}
      />
      <Field
        label="Product image URL (Amazon CDN)"
        value={values.imageUrl}
        onChange={(v) => setValues((s) => ({ ...s, imageUrl: v }))}
        required
      />
      <Field
        label="Affiliate link"
        value={values.affiliateUrl}
        onChange={(v) => setValues((s) => ({ ...s, affiliateUrl: v }))}
        required
      />
      <Field
        label="ASIN"
        value={values.asin}
        onChange={(v) => setValues((s) => ({ ...s, asin: v }))}
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Category
        </label>
        <select
          required
          value={values.categoryId}
          onChange={(e) =>
            setValues((s) => ({ ...s, categoryId: e.target.value }))
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          {categories
            .filter((c) => c.name !== "Trending")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <p className="font-medium">{error}</p>
          {failures.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs">
              {failures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-on-brand hover:bg-brand-dark disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : values.existingProductId
              ? "Update & publish"
              : "Publish"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-brand hover:text-brand hover:bg-brand-soft"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}

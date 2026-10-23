"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  fetchProductDetailsFromLink,
  generateDealPostFromManual,
} from "@/lib/manual-assist";

type CategoryOption = { id: string; name: string };

export type ProductFormValues = {
  title: string;
  description: string | null;
  dealPost: string | null;
  imageUrl: string;
  affiliateUrl: string;
  asin: string | null;
  categoryId: string;
  isTrending: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  expiresAt: string | null;
  scheduledAt: string | null;
};

export function ProductForm({
  categories,
  action,
  product,
  amazonConfigured = false,
  geminiConfigured = false,
}: {
  categories: CategoryOption[];
  action: (formData: FormData) => Promise<void>;
  product?: ProductFormValues;
  amazonConfigured?: boolean;
  geminiConfigured?: boolean;
}) {
  const [values, setValues] = useState({
    title: product?.title || "",
    description: product?.description || "",
    dealPost: product?.dealPost || "",
    imageUrl: product?.imageUrl || "",
    affiliateUrl: product?.affiliateUrl || "",
    asin: product?.asin || "",
    categoryId: product?.categoryId || categories[0]?.id || "",
    isTrending: product?.isTrending ?? false,
    isFeatured: product?.isFeatured ?? false,
    isPublished: product?.isPublished ?? true,
    expiresAt: product?.expiresAt ? product.expiresAt.slice(0, 16) : "",
    scheduledAt: product?.scheduledAt
      ? product.scheduledAt.slice(0, 16)
      : "",
  });
  const [assistError, setAssistError] = useState("");
  const [assistMessage, setAssistMessage] = useState("");
  const [fetchPending, startFetch] = useTransition();
  const [geminiPending, startGemini] = useTransition();

  const canSubmit = Boolean(
    values.title && values.imageUrl && values.affiliateUrl && values.categoryId
  );

  function onFetchFromLink() {
    setAssistError("");
    setAssistMessage("");
    startFetch(async () => {
      const res = await fetchProductDetailsFromLink(
        values.affiliateUrl || values.asin
      );
      if (!res.ok) {
        setAssistError(res.error);
        return;
      }
      setValues((s) => ({
        ...s,
        asin: res.asin,
        imageUrl: res.imageUrl,
        title: s.title.trim() ? s.title : res.title,
        description: s.description.trim() ? s.description : res.description,
      }));
      setAssistMessage("Image and product details loaded from Amazon.");
    });
  }

  function onGenerateDealPost() {
    setAssistError("");
    setAssistMessage("");
    startGemini(async () => {
      const res = await generateDealPostFromManual({
        title: values.title,
        description: values.description,
      });
      if (!res.ok) {
        setAssistError(res.error);
        return;
      }
      setValues((s) => ({
        ...s,
        title: res.title || s.title,
        description: res.dealPost,
        dealPost: res.dealPost,
      }));
      setAssistMessage("Title and description generated with Gemini.");
    });
  }

  return (
    <form
      action={action}
      className="space-y-5 rounded-xl bg-card border border-border p-6 max-w-3xl shadow-sm"
    >
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
            <p className="text-xs font-medium text-muted mb-1">Preview</p>
            <p className="text-sm font-semibold text-foreground line-clamp-2">
              {values.title || "Product title"}
            </p>
            {values.asin && (
              <p className="text-xs text-muted mt-1">ASIN: {values.asin}</p>
            )}
          </div>
        </div>
      )}

      <div>
        <Field
          label="Affiliate / deal link"
          name="affiliateUrl"
          required
          value={values.affiliateUrl}
          onChange={(v) => setValues((s) => ({ ...s, affiliateUrl: v }))}
          placeholder="https://www.amazon.com/dp/B0XXXXXXXX"
        />
        <p className="mt-1 text-xs text-muted-fg">
          Paste an Amazon product URL. Your Tracking ID (from Admins) is applied
          on save — any tag in the pasted URL is replaced. Fetch loads the
          Amazon CDN image and details.
        </p>
        <button
          type="button"
          onClick={onFetchFromLink}
          disabled={
            fetchPending ||
            !amazonConfigured ||
            (!values.affiliateUrl.trim() && !values.asin.trim())
          }
          className="mt-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:border-brand hover:text-brand hover:bg-brand-soft disabled:opacity-60"
        >
          {fetchPending ? "Fetching…" : "Fetch image & details from link"}
        </button>
        {!amazonConfigured && (
          <p className="mt-1 text-xs text-amber-600">
            Amazon API is not configured — paste the image URL manually.
          </p>
        )}
      </div>

      <Field
        label="Product title"
        name="title"
        required
        value={values.title}
        onChange={(v) => setValues((s) => ({ ...s, title: v }))}
      />

      <Field
        label="ASIN (optional)"
        name="asin"
        value={values.asin}
        onChange={(v) =>
          setValues((s) => ({
            ...s,
            asin: v.trim().toUpperCase().slice(0, 10),
          }))
        }
        placeholder="B0XXXXXXXX"
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Product description (source)
        </label>
        <textarea
          name="description"
          rows={4}
          value={values.description}
          onChange={(e) =>
            setValues((s) => ({ ...s, description: e.target.value }))
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <p className="mt-1 text-xs text-muted-fg">
          Source text for Gemini. Not shown on the site when a deal post exists.
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <label className="block text-sm font-medium text-foreground">
            Deal post (shown on site)
          </label>
          <button
            type="button"
            onClick={onGenerateDealPost}
            disabled={
              geminiPending ||
              !geminiConfigured ||
              !values.title.trim() ||
              !values.description.trim()
            }
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand hover:bg-brand-soft disabled:opacity-60"
          >
            {geminiPending ? "Generating…" : "Generate with Gemini"}
          </button>
        </div>
        <textarea
          name="dealPost"
          rows={8}
          value={values.dealPost}
          onChange={(e) =>
            setValues((s) => ({ ...s, dealPost: e.target.value }))
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        {!geminiConfigured && (
          <p className="mt-1 text-xs text-amber-600">
            Gemini is not configured — write the deal post manually.
          </p>
        )}
      </div>

      {(assistError || assistMessage) && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            assistError
              ? "border-red-500/30 bg-red-500/10 text-red-600"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
          }`}
        >
          {assistError || assistMessage}
        </div>
      )}

      <Field
        label="Product image URL (Amazon CDN — do not rehost)"
        name="imageUrl"
        required
        value={values.imageUrl}
        onChange={(v) => setValues((s) => ({ ...s, imageUrl: v }))}
        placeholder="https://m.media-amazon.com/..."
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Deal expires (optional)
        </label>
        <input
          type="datetime-local"
          name="expiresAt"
          value={values.expiresAt}
          onChange={(e) =>
            setValues((s) => ({ ...s, expiresAt: e.target.value }))
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Category
        </label>
        <select
          name="categoryId"
          required
          value={values.categoryId}
          onChange={(e) =>
            setValues((s) => ({ ...s, categoryId: e.target.value }))
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-5 pt-1">
        <Check
          name="isPublished"
          label="Published"
          checked={values.isPublished}
          onChange={(v) => setValues((s) => ({ ...s, isPublished: v }))}
        />
        <Check
          name="isTrending"
          label="Pin to Top Trending"
          checked={values.isTrending}
          onChange={(v) => setValues((s) => ({ ...s, isTrending: v }))}
        />
        <Check
          name="isFeatured"
          label="Featured"
          checked={values.isFeatured}
          onChange={(v) => setValues((s) => ({ ...s, isFeatured: v }))}
        />
      </div>

      {!values.isPublished && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Schedule publish (optional)
          </label>
          <input
            type="datetime-local"
            name="scheduledAt"
            value={values.scheduledAt}
            onChange={(e) =>
              setValues((s) => ({ ...s, scheduledAt: e.target.value }))
            }
            className="w-full sm:w-auto rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          <p className="mt-1 text-[11px] text-muted">
            Draft stays unpublished until this time. Cron{" "}
            <code className="bg-card-muted px-1 rounded text-foreground">
              /api/cron/daily
            </code>{" "}
            publishes due items.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {product ? "Save changes" : "Save & publish"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <input
        name={name}
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-muted-fg"
      />
    </div>
  );
}

function Check({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-border text-brand focus:ring-brand"
      />
      {label}
    </label>
  );
}

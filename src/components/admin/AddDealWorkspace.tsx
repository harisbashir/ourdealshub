"use client";

import type { FormState } from "@/lib/form-state";

import { useState } from "react";
import { QuickAddProduct } from "@/components/admin/QuickAddProduct";
import { ProductForm } from "@/components/admin/ProductForm";

type CategoryOption = { id: string; name: string };

export function AddDealWorkspace({
  categories,
  amazonConfigured,
  geminiConfigured,
  autoPublish,
  hasTrackingId,
  trackingIdLabel,
  hasTrackingIdUk = false,
  trackingIdLabelUk = null,
  isSuperAdminUser = false,
  createAction,
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
  createAction: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  return (
    <div className="space-y-5">
      <div
        className="inline-flex rounded-lg border border-border bg-card-muted p-1 text-sm"
        role="tablist"
        aria-label="Posting mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "auto"}
          onClick={() => setMode("auto")}
          className={`rounded-md px-3.5 py-1.5 font-medium transition-colors ${
            mode === "auto"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted hover:text-brand hover:bg-brand-soft"
          }`}
        >
          From URL / ASIN
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "manual"}
          onClick={() => setMode("manual")}
          className={`rounded-md px-3.5 py-1.5 font-medium transition-colors ${
            mode === "manual"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted hover:text-brand hover:bg-brand-soft"
          }`}
        >
          Manual post
        </button>
      </div>

      {mode === "auto" ? (
        <QuickAddProduct
          categories={categories}
          amazonConfigured={amazonConfigured}
          geminiConfigured={geminiConfigured}
          autoPublish={autoPublish}
          hasTrackingId={hasTrackingId}
          trackingIdLabel={trackingIdLabel}
          hasTrackingIdUk={hasTrackingIdUk}
          trackingIdLabelUk={trackingIdLabelUk}
          isSuperAdminUser={isSuperAdminUser}
        />
      ) : (
        <div className="space-y-4 max-w-3xl">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <h2 className="font-semibold text-foreground">Manual deal post</h2>
            <p className="text-sm text-muted mt-1">
              Paste an Amazon URL, fetch details, and edit the copy. Your
              Tracking ID (set under Admins) is applied on the server when you
              save.
            </p>
          </div>
          <ProductForm
            categories={categories}
            action={createAction}
            amazonConfigured={amazonConfigured}
            geminiConfigured={geminiConfigured}
          />
        </div>
      )}
    </div>
  );
}

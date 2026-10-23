"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyDealUrlButton({
  slug,
  siteUrl,
}: {
  slug: string;
  siteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const dealUrl = `${siteUrl.replace(/\/$/, "")}/deal/${slug}`;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(dealUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      title="Copy deal page URL"
      onClick={onCopy}
      className="admin-icon-btn rounded p-1.5 text-muted"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

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
      title="Copy page link"
      aria-label={copied ? "Link copied" : "Copy page link"}
      onClick={onCopy}
      className="pressable inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-card-muted hover:text-foreground"
    >
      {copied ? (
        <Check className="h-[18px] w-[18px] text-success" aria-hidden />
      ) : (
        <Copy className="h-[18px] w-[18px]" aria-hidden />
      )}
    </button>
  );
}

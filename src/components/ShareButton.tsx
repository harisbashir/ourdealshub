"use client";

import { useState } from "react";
import { Check, Share } from "lucide-react";

/** Native share sheet on phones; copies the link elsewhere. */
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled or unsupported payload — fall back to copying
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className="pressable inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-semibold text-foreground hover:bg-card-muted"
    >
      {copied ? (
        <Check className="h-5 w-5 text-success" aria-hidden />
      ) : (
        <Share className="h-5 w-5" aria-hidden />
      )}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}

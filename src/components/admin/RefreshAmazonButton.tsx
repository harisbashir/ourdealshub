"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshRecentAmazonImages } from "@/lib/admin-actions";

export function RefreshAmazonButton({
  configured,
  compact,
}: {
  configured: boolean;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function onClick() {
    setMessage("");
    startTransition(async () => {
      const res = await refreshRecentAmazonImages();
      setMessage(res.message);
    });
  }

  return (
    <div className={compact ? "w-full" : "flex flex-col gap-1"}>
      <button
        type="button"
        onClick={onClick}
        disabled={!configured || pending}
        title={
          configured
            ? "Sync title/image/description for up to 8 recent Amazon deals"
            : "Set Amazon API credentials to enable"
        }
        className={`admin-edge-btn inline-flex items-center gap-1.5 rounded-lg border-2 border-brand bg-brand-soft text-sm font-semibold text-brand disabled:opacity-45 disabled:pointer-events-none ${
          compact ? "w-full justify-center px-3 py-2" : "px-3.5 py-2"
        }`}
      >
        <RefreshCw
          className={`h-4 w-4 shrink-0 text-brand ${pending ? "animate-spin" : ""}`}
        />
        {pending ? "Syncing…" : "Refresh from Amazon"}
      </button>
      {message && (
        <p
          className={`text-xs text-muted mt-1 ${
            compact ? "text-center" : ""
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

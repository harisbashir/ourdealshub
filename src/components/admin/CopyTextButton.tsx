"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyTextButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-brand hover:text-brand"
    >
      {done ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {done ? "Copied" : label}
    </button>
  );
}

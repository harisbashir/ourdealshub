"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AnalyticsRangeForm({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const [start, setStart] = useState(from || "");
  const [end, setEnd] = useState(to || "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!start || !end) return;
    const params = new URLSearchParams();
    params.set("from", start);
    params.set("to", end);
    router.push(`/admin/analytics?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-center gap-1.5 justify-end"
    >
      <input
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:border-brand"
        aria-label="From date"
      />
      <span className="text-[10px] text-stone-400">to</span>
      <input
        type="date"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[11px] text-gray-700 outline-none focus:border-brand"
        aria-label="To date"
      />
      <button
        type="submit"
        className="rounded-lg border border-brand/30 bg-orange-50 px-2.5 py-1.5 text-[11px] font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
      >
        Apply
      </button>
    </form>
  );
}

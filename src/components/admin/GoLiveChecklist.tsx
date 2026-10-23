"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, Circle } from "lucide-react";
import type { ReadinessItem } from "@/lib/go-live-readiness";
import { StatusBadge } from "@/components/admin/ui";

export function GoLiveChecklist({
  items,
  readyExceptApis,
  apisReady,
}: {
  items: ReadinessItem[];
  readyExceptApis: boolean;
  apisReady: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pending = items.filter((i) => !i.ok);
  const requiredPending = pending.filter((i) => i.requiredForLaunch).length;

  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)] ring-1 ring-border-subtle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left sm:px-6"
      >
        {readyExceptApis ? (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
        ) : (
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-warning" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold text-foreground">Go-Live Readiness</h2>
            <StatusBadge tone={readyExceptApis ? (apisReady ? "success" : "neutral") : "warning"}>
              {readyExceptApis
                ? apisReady
                  ? "Ready"
                  : "Core ready"
                : `${requiredPending} required ${requiredPending === 1 ? "step" : "steps"} left`}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-[15px] text-muted">
            {pending.length === 0
              ? "Every check passed."
              : `${pending.length} ${pending.length === 1 ? "item needs" : "items need"} attention. Tap for details.`}
          </p>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <ul className="divide-y divide-border-subtle border-t border-border-subtle">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 px-4 py-3 sm:px-6">
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-label="Done" />
              ) : item.requiredForLaunch ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-label="Required" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-fg" aria-label="Optional" />
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-foreground">
                  {item.label}
                  {!item.requiredForLaunch && (
                    <span className="ml-2 text-[13px] font-normal text-muted">Optional</span>
                  )}
                </p>
                <p className="mt-0.5 text-[13px] text-muted">{item.detail}</p>
                {item.href && !item.ok && (
                  <Link href={item.href} className="mt-1 inline-flex min-h-9 items-center text-[15px] font-semibold text-brand hover:underline">
                    Fix This
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

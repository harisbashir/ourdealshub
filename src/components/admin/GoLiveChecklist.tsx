"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import type { ReadinessItem } from "@/lib/go-live-readiness";

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
  const pendingItems = items.filter((i) => !i.ok);
  const requiredPending = pendingItems.filter((i) => i.requiredForLaunch).length;

  const statusLabel = readyExceptApis
    ? apisReady
      ? "Ready"
      : "Core OK"
    : `${requiredPending} required`;

  return (
    <section className="admin-go-live-card admin-shell-static mb-6 sm:mb-8 rounded-xl border border-border bg-card overflow-hidden transition-[border-color,box-shadow] duration-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left"
      >
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
            readyExceptApis
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              : "border-amber-500/35 bg-amber-500/10 text-amber-600"
          }`}
        >
          {readyExceptApis ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[13px] font-semibold text-foreground">
              Go-live readiness
            </span>
            <span
              className={`rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wide border ${
                readyExceptApis
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          {pendingItems.length === 0 ? (
            <p className="text-[10px] text-muted mt-1">All checks passed</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {pendingItems.map((item) => (
                <span
                  key={item.id}
                  className={`inline-flex max-w-[11rem] truncate rounded border px-1.5 py-0.5 text-[9px] font-medium leading-tight ${
                    item.requiredForLaunch
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      : "border-border bg-card-muted text-muted"
                  }`}
                  title={item.label}
                >
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <ChevronDown
          className={`mt-1 h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          <p className="text-[10px] text-muted mb-2">
            Details · Amazon / Gemini keys can wait until you import.
          </p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-2 text-sm border-b border-border-subtle pb-2 last:border-0 last:pb-0"
              >
                {item.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : item.requiredForLaunch ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-fg shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-foreground leading-snug">
                    {item.label}
                    {!item.requiredForLaunch && (
                      <span className="ml-1 text-[9px] uppercase tracking-wide text-muted-fg font-semibold">
                        optional
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted mt-0.5 leading-snug">
                    {item.detail}
                  </p>
                  {item.href && !item.ok && (
                    <Link
                      href={item.href}
                      className="inline-block mt-1 text-[11px] font-semibold text-brand hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Fix →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

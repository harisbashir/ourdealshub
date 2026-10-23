"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/components/ThemeProvider";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

/**
 * Appearance menu: System (default, follows the device) / Light / Dark.
 * HIG prefers following the system setting; System stays the default and the
 * explicit choices are an override the person can always undo.
 */
export function ThemeToggle({ align = "right" }: { align?: "left" | "right" }) {
  const { preference, resolved, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const Current = preference === "system" ? Monitor : resolved === "dark" ? Moon : Sun;

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Appearance: ${OPTIONS.find((o) => o.value === preference)?.label}`}
        className="pressable inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-card-muted"
      >
        <Current className="h-5 w-5" aria-hidden />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Appearance"
          className={`absolute top-full z-50 mt-1 w-44 overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-fg">
            Appearance
          </p>
          {OPTIONS.map(({ value, label, Icon }) => {
            const selected = preference === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setPreference(value);
                  setOpen(false);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] text-foreground hover:bg-card-muted"
              >
                <Icon className="h-[18px] w-[18px] text-muted" aria-hidden />
                <span className="flex-1">{label}</span>
                {selected && <Check className="h-4 w-4 text-brand" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

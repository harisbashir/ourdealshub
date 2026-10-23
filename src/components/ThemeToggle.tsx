"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type ThemePreference } from "@/components/ThemeProvider";

const LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, cycle } = useTheme();
  const Icon =
    preference === "dark" ? Moon : preference === "light" ? Sun : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${LABELS[preference]} (click to change)`}
      aria-label={`Theme ${LABELS[preference]}. Click to switch.`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-border bg-card text-foreground transition-colors hover:border-brand hover:text-brand hover:bg-brand-soft ${
        compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-9 px-2.5 text-xs font-medium"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!compact && <span className="hidden sm:inline">{LABELS[preference]}</span>}
    </button>
  );
}

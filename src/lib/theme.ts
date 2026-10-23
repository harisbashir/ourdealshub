/**
 * Site accent colour presets (Admin → Settings → Appearance).
 *
 * Every value is checked for WCAG AA in both appearances:
 * - light: accent on #FFFFFF and #F2F2F7 ≥ 4.5:1, white text on accent ≥ 4.5:1
 * - dark:  accent on #1C1C1E and #0B0B0D ≥ 4.5:1, black text on accent ≥ 7:1
 * The matching CSS variables live in globals.css under [data-accent="…"].
 * Keep both lists in sync when adding a preset.
 */
export const ACCENT_PRESETS = [
  { id: "tangerine", label: "Tangerine", light: "#C2410C", dark: "#FF9F0A" },
  { id: "blue", label: "Blue", light: "#0066CC", dark: "#409CFF" },
  { id: "indigo", label: "Indigo", light: "#4F46E5", dark: "#8B8AFF" },
  { id: "teal", label: "Teal", light: "#0F766E", dark: "#3FD0C9" },
  { id: "green", label: "Green", light: "#1B7F3B", dark: "#34C759" },
  { id: "pink", label: "Pink", light: "#C0266D", dark: "#FF6FAE" },
  { id: "purple", label: "Purple", light: "#7C3AED", dark: "#C38BFF" },
  { id: "red", label: "Red", light: "#C42B1C", dark: "#FF6B60" },
  { id: "graphite", label: "Graphite", light: "#3A3A3C", dark: "#D1D1D6" },
] as const;

export type AccentId = (typeof ACCENT_PRESETS)[number]["id"];

export const DEFAULT_ACCENT: AccentId = "tangerine";

export function parseAccent(value: string | null | undefined): AccentId {
  const v = String(value || "").trim().toLowerCase();
  return (ACCENT_PRESETS.find((p) => p.id === v)?.id ?? DEFAULT_ACCENT) as AccentId;
}

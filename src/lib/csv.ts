/**
 * Escape one CSV cell. Cells that start with a formula trigger
 * (= + - @ tab CR) are prefixed with ' so Excel/Sheets show them as text
 * instead of evaluating them (CSV/formula injection).
 */
export function csvEscape(value: string | number | null | undefined): string {
  let s = String(value ?? "");
  const isPlainNumber = /^-?\d+(\.\d+)?$/.test(s);
  if (!isPlainNumber && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

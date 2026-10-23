export const PUBLIC_PAGE_SIZE = 36;

export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(value || "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 500);
}

export function totalPages(total: number, pageSize = PUBLIC_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

export function pageHref(basePath: string, page: number, extra?: Record<string, string>) {
  const params = new URLSearchParams(extra);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

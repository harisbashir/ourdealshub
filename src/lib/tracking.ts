/**
 * Normalize Amazon Associates tracking / partner tag.
 * Returns null if empty/invalid.
 */
export function normalizeTrackingId(raw: string | null | undefined): string | null {
  const tag = String(raw || "")
    .trim()
    .toLowerCase()
    .slice(0, 64);
  if (!tag) return null;
  // Associates tags are typically alphanumeric with hyphens
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/i.test(tag)) return null;
  return tag;
}

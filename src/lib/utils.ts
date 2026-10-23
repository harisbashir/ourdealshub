const MAX_SLUG_LENGTH = 80;

export function slugify(text: string): string {
  const slug = text
    // "Café" → "cafe" instead of dropping the accented letter
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  // Long Amazon titles: cut at a word boundary so URLs stay readable
  const cut = slug.slice(0, MAX_SLUG_LENGTH);
  return cut.slice(0, cut.lastIndexOf("-") > 40 ? cut.lastIndexOf("-") : MAX_SLUG_LENGTH);
}

/** Public contact email for privacy / contact pages. */
export function getContactEmail(): string {
  const fromEnv = process.env.CONTACT_EMAIL?.trim();
  if (fromEnv) return fromEnv;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      const host = new URL(site).hostname.replace(/^www\./i, "");
      if (host && host !== "localhost") return `hello@${host}`;
    } catch {
      /* fall through */
    }
  }

  return "hello@ourdealshub.com";
}

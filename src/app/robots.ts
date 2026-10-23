import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  const isProd = process.env.NODE_ENV === "production";
  const isVercelPreview = process.env.VERCEL_ENV === "preview";

  if (!isProd || isVercelPreview) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/go/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/product-query";

// Query at request time — prerendering at build would require a live DB.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  const [products, categories, posts] = await Promise.all([
    prisma.product.findMany({
      where: publicProductWhere(),
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.category.findMany({
      select: { slug: true, updatedAt: true },
    }),
    prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 2000,
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    {
      url: `${siteUrl}/deals/all`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/deals/trending`,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    { url: `${siteUrl}/browse`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/help`, changeFrequency: "monthly", priority: 0.4 },
    {
      url: `${siteUrl}/blog`,
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/contact`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/disclosure`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((c) => c.slug !== "trending")
    .map((c) => ({
      url: `${siteUrl}/category/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  const dealPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/deal/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  return [...staticPages, ...categoryPages, ...dealPages, ...blogPages];
}

import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Blog — OurDealsHub",
  description:
    "Saving tips, deal guides, and shopping roundups from OurDealsHub.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="site-container py-8 sm:py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Blog</h1>
        <p className="mt-2 text-sm sm:text-base text-muted">
          Tips, guides, and deal roundups — curated picks and shopping advice
          from OurDealsHub.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <p className="text-sm text-muted">No posts yet — check back soon.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/blog/${p.slug}`}
                className="product-card group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                {p.coverImageUrl ? (
                  <div className="relative aspect-[16/10] bg-card-muted">
                    <Image
                      src={p.coverImageUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-brand-soft to-card-muted flex items-end p-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand">
                      OurDealsHub
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <time className="text-xs font-medium text-muted-fg">
                    {p.publishedAt
                      ? new Date(p.publishedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </time>
                  <h2 className="mt-1 text-base font-bold text-foreground group-hover:text-brand line-clamp-2">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="mt-1.5 text-sm text-muted line-clamp-3">
                      {p.excerpt}
                    </p>
                  )}
                  {p._count.products > 0 && (
                    <p className="mt-auto pt-3 text-xs font-semibold text-brand">
                      {p._count.products} deal
                      {p._count.products === 1 ? "" : "s"} in this post →
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

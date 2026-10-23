import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Flame, Sparkles, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SafeProductImage } from "@/components/SafeProductImage";
import { AffiliateLinkNote } from "@/components/AffiliateDisclosure";
import {
  publicProductWhere,
  productCardSelect,
  getTrendingProducts,
  getRecentProducts,
} from "@/lib/product-query";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
    select: {
      title: true,
      excerpt: true,
      coverImageUrl: true,
      products: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        select: { product: { select: { imageUrl: true } } },
      },
    },
  });
  if (!post) return { title: "Post — OurDealsHub" };
  const image =
    post.coverImageUrl || post.products[0]?.product.imageUrl || undefined;
  const description = post.excerpt || undefined;
  return {
    title: `${post.title} — OurDealsHub`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

type Block =
  | { type: "h2"; text: string; id: string }
  | { type: "p"; text: string };

function slugHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

/** Blank-line paragraphs; short title-like lines become H2 + TOC entries. */
function parseContent(content: string): Block[] {
  const chunks = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return chunks.map((text) => {
    const singleLine = !text.includes("\n");
    const looksHeading =
      singleLine &&
      text.length <= 72 &&
      !/[.!?]$/.test(text) &&
      text.split(/\s+/).length <= 12;
    if (looksHeading) {
      return { type: "h2" as const, text, id: slugHeading(text) };
    }
    return { type: "p" as const, text };
  });
}

function estimateReadMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            select: {
              ...productCardSelect,
              category: { select: { name: true, slug: true, parentId: true } },
            },
          },
        },
      },
    },
  });

  if (!post) notFound();

  const deals = post.products.map((bp) => bp.product).filter(Boolean);
  const publicIds = new Set(
    (
      await prisma.product.findMany({
        where: {
          AND: [publicProductWhere(), { id: { in: deals.map((d) => d.id) } }],
        },
        select: { id: true },
      })
    ).map((d) => d.id)
  );
  const visibleDeals = deals.filter((d) => publicIds.has(d.id));
  const primaryDeal = visibleDeals[0] || null;

  const categoryMap = new Map<string, { name: string; slug: string }>();
  for (const d of visibleDeals) {
    if (d.category && d.category.slug !== "trending") {
      categoryMap.set(d.category.slug, {
        name: d.category.name,
        slug: d.category.slug,
      });
    }
  }
  const relatedCategories = [...categoryMap.values()].slice(0, 8);

  const [trending, recent, morePosts] = await Promise.all([
    getTrendingProducts(4),
    getRecentProducts(4),
    prisma.blogPost.findMany({
      where: { isPublished: true, NOT: { id: post.id } },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        title: true,
        slug: true,
        coverImageUrl: true,
        publishedAt: true,
      },
    }),
  ]);

  const blocks = parseContent(post.content);
  const toc = blocks.filter((b): b is Extract<Block, { type: "h2" }> => b.type === "h2");
  const readMins = estimateReadMinutes(post.content);
  const dateLabel = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="site-container py-6 sm:py-10">
      <nav className="text-xs text-muted mb-4 flex flex-wrap items-center gap-1.5">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="text-muted-fg">›</span>
        <Link href="/blog" className="hover:text-brand">
          Blog
        </Link>
        <span className="text-muted-fg">›</span>
        <span className="text-foreground line-clamp-1">{post.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
        <article className="min-w-0">
          <header className="mb-6">
            <span className="inline-flex rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
              {visibleDeals.length > 0 ? "Deal roundup" : "Guide"}
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-[2rem] font-bold text-foreground leading-tight tracking-tight">
              {post.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="font-semibold text-foreground">OurDealsHub</span>
              {dateLabel && <span>{dateLabel}</span>}
              <span>{readMins} min read</span>
            </div>
            {post.excerpt && (
              <p className="mt-3 text-base text-muted leading-relaxed">
                {post.excerpt}
              </p>
            )}
          </header>

          {post.coverImageUrl && (
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-xl border border-border bg-card-muted shadow-sm">
              <Image
                src={post.coverImageUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
          )}

          {toc.length >= 2 && (
            <div className="mb-8 rounded-xl border border-border bg-card-muted/60 px-4 py-3 sm:hidden">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-2">
                In this post
              </p>
              <ol className="space-y-1.5 text-sm">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="text-foreground hover:text-brand">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="space-y-4 text-[15px] sm:text-base leading-relaxed text-foreground">
            {blocks.map((b, i) =>
              b.type === "h2" ? (
                <h2
                  key={i}
                  id={b.id}
                  className="scroll-mt-28 pt-2 text-xl font-bold text-foreground tracking-tight"
                >
                  {b.text}
                </h2>
              ) : (
                <p key={i} className="whitespace-pre-wrap text-foreground/95">
                  {b.text}
                </p>
              )
            )}
          </div>

          {primaryDeal && (
            <div className="mt-8 space-y-3">
              <a
                href={`/go/${primaryDeal.slug}?src=blog`}
                rel="nofollow sponsored noopener noreferrer"
                target="_blank"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-brand/25 hover:bg-brand-dark transition-colors"
              >
                View this deal on Amazon
                <ExternalLink className="h-4 w-4" />
              </a>
              <AffiliateLinkNote />
            </div>
          )}

          {visibleDeals.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-bold text-foreground mb-1">
                Deals in this post
              </h2>
              <p className="text-sm text-muted mb-4">
                Tap through for details — prices and availability are on Amazon.
              </p>
              <ul className="space-y-3">
                {visibleDeals.map((d) => (
                  <li key={d.id}>
                    <div className="product-card flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                      <Link
                        href={`/deal/${d.slug}`}
                        className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-lg bg-card-muted border border-border"
                      >
                        <SafeProductImage
                          src={d.imageUrl}
                          alt=""
                          fill
                          className="object-contain p-1.5"
                          sizes="96px"
                        />
                      </Link>
                      <div className="min-w-0 flex-1 flex flex-col">
                        <Link
                          href={`/deal/${d.slug}`}
                          className="text-sm font-semibold text-foreground hover:text-brand line-clamp-2"
                        >
                          {d.title}
                        </Link>
                        {d.category && (
                          <p className="text-xs text-muted mt-0.5">
                            {d.category.name}
                          </p>
                        )}
                        <div className="mt-auto pt-2 flex flex-wrap gap-2">
                          <a
                            href={`/go/${d.slug}?src=blog`}
                            rel="nofollow sponsored noopener noreferrer"
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
                          >
                            Get deal
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <Link
                            href={`/deal/${d.slug}`}
                            className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {relatedCategories.length > 0 && (
            <section className="mt-8 rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-2.5">
                Related categories
              </p>
              <div className="flex flex-wrap gap-2">
                {relatedCategories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    className="cat-pill rounded-full border border-border bg-card-muted px-3 py-1.5 text-xs font-semibold text-foreground"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              OD
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">OurDealsHub</p>
              <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed">
                Curated Amazon picks and practical shopping guides. As an Amazon
                Associate, OurDealsHub earns from qualifying purchases.
              </p>
              <Link
                href="/blog"
                className="mt-2 inline-block text-xs font-semibold text-brand hover:underline"
              >
                More from the blog →
              </Link>
            </div>
          </section>

          {morePosts.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-bold text-foreground mb-4">
                More posts
              </h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {morePosts.map((p) => (
                  <li key={p.slug}>
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
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="aspect-[16/10] bg-gradient-to-br from-brand-soft to-card-muted" />
                      )}
                      <p className="p-3 text-sm font-semibold text-foreground group-hover:text-brand line-clamp-2">
                        {p.title}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-28">
          {toc.length >= 2 && (
            <div className="hidden sm:block rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-2">
                In this post
              </p>
              <ol className="space-y-2 text-sm">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className="text-muted hover:text-brand leading-snug"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <SidebarDealList
            title="Trending deals"
            icon={<Flame className="h-4 w-4 text-brand" />}
            products={trending}
            viewAllHref="/deals/trending"
            viewAllLabel="View all trending"
          />

          <SidebarDealList
            title="Just added"
            icon={<Sparkles className="h-4 w-4 text-brand" />}
            products={recent}
            viewAllHref="/deals/just-added"
            viewAllLabel="View new deals"
          />

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Shop deals
            </p>
            <Link
              href="/deals/trending"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-foreground hover:bg-brand-soft hover:text-brand"
            >
              <Flame className="h-4 w-4 text-brand" /> Trending
            </Link>
            <Link
              href="/deals/just-added"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-foreground hover:bg-brand-soft hover:text-brand"
            >
              <Sparkles className="h-4 w-4 text-brand" /> Just added
            </Link>
            <Link
              href="/deals/all"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-foreground hover:bg-brand-soft hover:text-brand"
            >
              All picks
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SidebarDealList({
  title,
  icon,
  products,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  icon: ReactNode;
  products: { id: string; title: string; slug: string; imageUrl: string }[];
  viewAllHref: string;
  viewAllLabel: string;
}) {
  if (products.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-sm font-bold text-foreground">{title}</p>
      </div>
      <ul className="space-y-3">
        {products.slice(0, 4).map((p) => (
          <li key={p.id}>
            <Link href={`/deal/${p.slug}`} className="flex gap-2.5 group">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-card-muted border border-border">
                <SafeProductImage
                  src={p.imageUrl}
                  alt=""
                  fill
                  className="object-contain p-1"
                  sizes="48px"
                />
              </span>
              <span className="text-xs font-medium text-foreground group-hover:text-brand line-clamp-3 leading-snug">
                {p.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={viewAllHref}
        className="mt-3 flex w-full items-center justify-center rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark"
      >
        {viewAllLabel} →
      </Link>
    </div>
  );
}

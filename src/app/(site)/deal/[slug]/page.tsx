import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { ProductGrid } from "@/components/ProductGrid";
import { SafeProductImage } from "@/components/SafeProductImage";
import { AffiliateLinkNote } from "@/components/AffiliateDisclosure";
import { StickyDealCta } from "@/components/StickyDealCta";
import { SaveButton } from "@/components/SaveButton";
import { ShareButton } from "@/components/ShareButton";
import { publicProductWhere, getRelatedProducts } from "@/lib/product-query";
import { marketplaceLabel, marketplaceShipsNote } from "@/lib/marketplace";
import { AFFILIATE_LINK_REL } from "@/lib/affiliate-disclosure";
import { DealSavings } from "@/components/DealSavings";

type Props = { params: Promise<{ slug: string }> };

/** Shared by generateMetadata + page — one DB query per request. */
const getPublicDeal = cache((slug: string) =>
  prisma.product.findFirst({
    where: publicProductWhere({ slug }),
    include: { category: { include: { parent: true } } },
  })
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicDeal(slug);
  if (!product) return { title: "Pick not found" };

  const desc =
    (product.dealPost || product.description || "")
      .replace(/\s+/g, " ")
      .slice(0, 155) || `${product.title} — a curated pick on OurDealsHub.`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    robots: product.isDemo ? { index: false, follow: false } : undefined,
    title: product.title,
    description: desc,
    alternates: { canonical: `/deal/${product.slug}` },
    openGraph: {
      title: product.title,
      description: desc,
      images: [{ url: product.imageUrl }],
      type: "website",
      url: `${siteUrl}/deal/${product.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: desc,
      images: [product.imageUrl],
    },
  };
}

export default async function DealPage({ params }: Props) {
  const { slug } = await params;
  const product = await getPublicDeal(slug);
  if (!product) notFound();

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const goUrl = `/go/${product.slug}`;
  const body = product.dealPost || product.description;
  const crumbs = [
    ...(product.category.parent
      ? [{ name: product.category.parent.name, href: `/category/${product.category.parent.slug}` }]
      : []),
    { name: product.category.name, href: `/category/${product.category.slug}` },
  ];

  const related = await getRelatedProducts({
    productId: product.id,
    categoryId: product.categoryId,
    parentCategoryId: product.category.parentId,
    marketplace: product.marketplace,
    take: 8,
  });

  // No offers/price: prices may only be shown from Amazon's live data
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      image: product.imageUrl,
      description: body || undefined,
      url: `${siteUrl}/deal/${product.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Home", href: "/" },
        ...crumbs,
        { name: product.title, href: `/deal/${product.slug}` },
      ].map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: `${siteUrl}${c.href}`,
      })),
    },
  ];

  return (
    <div className="pb-24 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(product.isDemo ? [] : jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {!product.isDemo && <StickyDealCta goUrl={goUrl} title={product.title} />}

      <nav aria-label="Breadcrumb" className="site-container pt-4">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
          <li>
            <Link href="/" className="hover:text-foreground">Home</Link>
          </li>
          {crumbs.map((c) => (
            <li key={c.href} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-fg" aria-hidden />
              <Link href={c.href} className="hover:text-foreground">{c.name}</Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="site-container grid gap-6 pt-4 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-10 lg:pt-6">
        <div className="shelf relative mx-auto aspect-square w-full max-w-[26rem] overflow-hidden rounded-3xl ring-1 ring-border-subtle">
          <SafeProductImage
            src={product.imageUrl}
            alt={product.title}
            fill
            priority
            className="object-contain p-6"
            sizes="(max-width:1024px) 92vw, 416px"
          />
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">
            {marketplaceLabel(product.marketplace)}
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight text-foreground sm:text-[32px]">
            {product.title}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {product.isDemo ? "Sample listing · original illustration · preview only" : marketplaceShipsNote(product.marketplace)}
          </p>

          <div id="deal-primary-cta" className="mt-5 max-w-md space-y-3">
            <DealSavings product={{ isDemo: product.isDemo, slug: product.slug, marketplace: product.marketplace,
              discountPercent: product.discountPercent, discountBasis: product.discountBasis,
              discountFetchedAt: product.discountFetchedAt, discountExpiresAt: product.discountExpiresAt }} />
            {product.isDemo ? <p className="rounded-2xl bg-card-muted p-4 text-[15px] leading-relaxed text-muted ring-1 ring-border-subtle">This sample lets you explore the layout. It is not a real offer and has no shopping link.</p> : <>
            <a
              href={goUrl}
              target="_blank"
              rel={AFFILIATE_LINK_REL}
              className="pressable flex h-[3.25rem] w-full items-center justify-center rounded-full bg-brand text-[17px] font-semibold text-on-brand hover:bg-brand-dark"
            >
              Get deal on Amazon
            </a>
            </>}
            <div className="flex gap-3">
              <SaveButton slug={product.slug} title={product.title} variant="button" />
              <ShareButton title={product.title} path={`/deal/${product.slug}`} />
            </div>
            {!product.isDemo && <AffiliateLinkNote />}
          </div>

          <section className="mt-8 max-w-2xl" aria-labelledby="why-heading">
            <h2 id="why-heading" className="text-xl font-semibold text-foreground">
              Why it&apos;s here
            </h2>
            {body ? (
              <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed text-foreground/90">
                {body}
              </p>
            ) : (
              <p className="mt-2 text-[17px] leading-relaxed text-muted">
                Full details, current price and delivery options are on Amazon.
              </p>
            )}
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <ProductGrid
          title="You Might Also Like"
          subtitle={`More in ${product.category.name}`}
          products={related}
          layout="carousel"
        />
      )}
    </div>
  );
}

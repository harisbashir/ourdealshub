import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ProductGrid } from "@/components/ProductGrid";
import { SafeProductImage } from "@/components/SafeProductImage";
import { AffiliateLinkNote } from "@/components/AffiliateDisclosure";
import { StickyDealCta } from "@/components/StickyDealCta";
import {
  publicProductWhere,
  getRelatedProducts,
} from "@/lib/product-query";
import {
  marketplaceBadge,
  marketplaceLabel,
  marketplaceTagClass,
  marketplaceShipsNote,
} from "@/lib/marketplace";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: publicProductWhere({ slug }),
  });
  if (!product) return { title: "Deal" };

  const desc =
    product.dealPost?.slice(0, 155) ||
    product.description?.slice(0, 155) ||
    `${product.title} — curated deal on OurDealsHub.`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    title: product.title,
    description: desc,
    alternates: {
      canonical: `/deal/${product.slug}`,
    },
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
  const product = await prisma.product.findFirst({
    where: publicProductWhere({ slug }),
    include: { category: { include: { parent: true } } },
  });
  if (!product) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const goUrl = `/go/${product.slug}`;
  const body = product.dealPost || product.description;

  const related = await getRelatedProducts({
    productId: product.id,
    categoryId: product.categoryId,
    parentCategoryId: product.category.parentId,
    marketplace: product.marketplace,
    take: 8,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.imageUrl,
    description: body || undefined,
    url: `${siteUrl}/deal/${product.slug}`,
  };

  return (
    <div className="site-container py-10 pb-24 sm:pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <StickyDealCta goUrl={goUrl} marketplace={product.marketplace} />

      <nav className="text-sm text-muted mb-6">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        {product.category.parent && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/category/${product.category.parent.slug}`}
              className="hover:text-brand"
            >
              {product.category.parent.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <Link
          href={`/category/${product.category.slug}`}
          className="hover:text-brand"
        >
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[420px_1fr] lg:items-start">
        {/* Match common deal-site pattern: 420×420 frame, image contained (no stretch/pixelation) */}
        <div className="mx-auto w-full max-w-[420px] lg:mx-0">
          <div className="relative mx-auto h-[min(100vw-2rem,420px)] w-[min(100vw-2rem,420px)] max-h-[420px] max-w-[420px] rounded-2xl overflow-hidden bg-white border border-border">
            <span
              className={`absolute left-3 top-3 z-10 rounded-md border px-2.5 py-1 text-xs font-black uppercase tracking-wider ${marketplaceTagClass(product.marketplace)}`}
            >
              {marketplaceBadge(product.marketplace)}
            </span>
            <SafeProductImage
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-contain"
              sizes="420px"
              priority
            />
          </div>
        </div>

        <div>
          <div className="mb-3 inline-flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-black uppercase tracking-wider ${marketplaceTagClass(product.marketplace)}`}
            >
              {marketplaceBadge(product.marketplace)}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {marketplaceLabel(product.marketplace)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {product.title}
          </h1>
          <p className="mt-3 text-sm text-muted leading-relaxed max-w-xl">
            {marketplaceShipsNote(product.marketplace)}
          </p>

          <div className="mt-6 max-w-md" id="deal-primary-cta">
            <AffiliateLinkNote className="mb-3" />
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={goUrl}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className="flex-1 rounded-lg bg-brand py-3.5 text-center text-base font-bold text-white hover:bg-brand-dark transition-colors"
              >
                View on Amazon
              </a>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-foreground mb-2">
              Deal details
            </h2>
            {body ? (
              <p className="text-sm text-muted whitespace-pre-line leading-relaxed">
                {body}
              </p>
            ) : (
              <p className="text-sm text-muted leading-relaxed">
                Full product information is on Amazon. Use View on Amazon for
                specs, price, and availability.
              </p>
            )}
          </div>

          <p className="mt-8 text-xs text-muted-fg leading-relaxed max-w-xl">
            OurDealsHub is a participant in the Amazon Services LLC Associates
            Program. Prices and availability may change on Amazon.{" "}
            <Link href="/disclosure" className="underline hover:text-brand">
              Full affiliate disclosure
            </Link>
            .
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <ProductGrid
          title="Related picks"
          subtitle={`More in ${product.category.name}`}
          products={related}
          layout="carousel"
          icon="grid"
        />
      )}
    </div>
  );
}

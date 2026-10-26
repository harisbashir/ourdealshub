import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProductForm } from "@/lib/form-actions";
import { requireProductAccess } from "@/lib/admin-auth";
import { isAmazonConfigured } from "@/lib/amazon";
import { isGeminiConfigured } from "@/lib/gemini";
import { listCategoryOptions } from "@/lib/category-resolve";
import { canManageOwnedProduct } from "@/lib/permissions";
import { marketplaceLabel } from "@/lib/marketplace";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit Product — Admin" };

export default async function EditProductPage({ params }: Props) {
  const admin = await requireProductAccess();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    listCategoryOptions(),
  ]);
  if (!product || product.deletedAt) notFound();
  if (!canManageOwnedProduct(admin, product)) notFound();

  if (product.isDemo) return <div className="max-w-2xl space-y-4 rounded-2xl bg-card p-6 ring-1 ring-border-subtle">
    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sample preview</h1>
    <p className="text-[15px] leading-relaxed text-muted">{product.title} is a sample listing with an original illustration. Samples are read-only, never earn commissions, and never enter social automation. Add a real deal to publish your own product.</p>
    <div className="flex flex-wrap gap-3"><Link href={`/deal/${product.slug}`} className="pressable inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-[15px] font-semibold text-on-brand">View sample</Link><Link href="/admin/settings#samples" className="pressable inline-flex min-h-11 items-center rounded-full bg-card-muted px-5 text-[15px] font-medium text-foreground">Manage samples</Link></div>
  </div>;
  const action = updateProductForm.bind(null, product.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Edit product</h1>
        <span
          className="rounded-md border border-brand/40 bg-brand-soft px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-brand"
          title={marketplaceLabel(product.marketplace)}
        >
          {product.marketplace || "US"}
        </span>
        <span className="text-sm text-muted">
          {marketplaceLabel(product.marketplace)}
        </span>
      </div>
      <ProductForm
        categories={categories}
        action={action}
        amazonConfigured={await isAmazonConfigured()}
        geminiConfigured={await isGeminiConfigured()}
        product={{
          marketplace: product.marketplace,
          title: product.title,
          description: product.description,
          dealPost: product.dealPost,
          imageUrl: product.imageUrl,
          affiliateUrl: product.affiliateUrl,
          asin: product.asin,
          categoryId: product.categoryId,
          isTrending: product.isTrending,
          isFeatured: product.isFeatured,
          isPublished: product.isPublished,
          expiresAt: product.expiresAt?.toISOString() || null,
          scheduledAt: product.scheduledAt?.toISOString() || null,
        }}
      />
    </div>
  );
}

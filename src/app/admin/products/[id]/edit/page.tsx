import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProduct } from "@/lib/admin-actions";
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

  const action = updateProduct.bind(null, product.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Edit product</h1>
        <span
          className="rounded-md border border-brand/40 bg-brand-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand"
          title={marketplaceLabel(product.marketplace)}
        >
          {product.marketplace === "UK" ? "UK" : "US"}
        </span>
        <span className="text-sm text-muted">
          {marketplaceLabel(product.marketplace)}
        </span>
      </div>
      <ProductForm
        categories={categories}
        action={action}
        amazonConfigured={isAmazonConfigured()}
        geminiConfigured={isGeminiConfigured()}
        product={{
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

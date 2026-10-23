import { assertSuperAdminPage } from "@/lib/admin-actions";
import { createBlogPost } from "@/lib/blog-actions";
import { BlogForm } from "@/components/admin/BlogForm";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/product-query";

export const metadata = { title: "New Blog Post — Admin" };

export default async function NewBlogPostPage() {
  await assertSuperAdminPage();
  const products = await prisma.product.findMany({
    where: publicProductWhere(),
    orderBy: { createdAt: "desc" },
    take: 80,
    select: { id: true, title: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">New blog post</h1>
      <BlogForm action={createBlogPost} products={products} />
    </div>
  );
}

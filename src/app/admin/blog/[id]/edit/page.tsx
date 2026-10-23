import { notFound } from "next/navigation";
import { assertSuperAdminPage } from "@/lib/admin-actions";
import { updateBlogPostForm } from "@/lib/form-actions";
import { BlogForm } from "@/components/admin/BlogForm";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/product-query";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit Blog Post — Admin" };

export default async function EditBlogPostPage({ params }: Props) {
  await assertSuperAdminPage();
  const { id } = await params;

  const [post, products] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { id },
      include: {
        products: { orderBy: { sortOrder: "asc" }, select: { productId: true } },
      },
    }),
    prisma.product.findMany({
      where: publicProductWhere(),
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, title: true },
    }),
  ]);

  if (!post) notFound();

  const action = updateBlogPostForm.bind(null, post.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Edit blog post</h1>
      <BlogForm
        action={action}
        products={products}
        post={{
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          coverImageUrl: post.coverImageUrl,
          isPublished: post.isPublished,
          productIds: post.products.map((p) => p.productId),
        }}
      />
    </div>
  );
}

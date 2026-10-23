import Link from "next/link";
import { Plus } from "lucide-react";
import { assertSuperAdminPage } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";
import { BlogPostsTable } from "@/components/admin/BlogPostsTable";

export const metadata = { title: "Blog — Admin" };

export default async function AdminBlogPage() {
  await assertSuperAdminPage();

  const posts = await prisma.blogPost.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true, email: true } },
      _count: { select: { products: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog</h1>
          <p className="text-sm text-muted mt-1">
            Tips, guides, and deal roundups with attached products.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-dark shadow-sm shadow-brand/20"
        >
          <Plus className="h-4 w-4" /> New post
        </Link>
      </div>

      <BlogPostsTable
        posts={posts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          isPublished: p.isPublished,
          publishedAt: p.publishedAt?.toISOString() || null,
          createdAt: p.createdAt.toISOString(),
          productCount: p._count.products,
          createdByName: p.createdBy?.name || p.createdBy?.email || null,
        }))}
      />
    </div>
  );
}

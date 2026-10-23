"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { deleteBlogPost } from "@/lib/blog-actions";
import { AdminHScroll } from "@/components/admin/AdminHScroll";

export type AdminBlogRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  productCount: number;
  createdByName: string | null;
};

export function BlogPostsTable({ posts }: { posts: AdminBlogRow[] }) {
  const router = useRouter();

  return (
    <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
      <AdminHScroll>
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[minmax(200px,1.6fr)_auto_auto_auto_auto_auto] gap-x-2 items-center bg-card-muted text-left text-muted text-sm px-3 py-2.5 border-b border-border">
            <span className="px-1 font-medium">Post</span>
            <span className="px-1 font-medium">Status</span>
            <span className="px-1 font-medium">Deals</span>
            <span className="px-1 font-medium">Published</span>
            <span className="px-1 font-medium">By</span>
            <span className="px-1 font-medium">Actions</span>
          </div>

          <div className="space-y-2 p-2.5">
            {posts.map((p) => (
              <article
                key={p.id}
                className="grid grid-cols-[minmax(200px,1.6fr)_auto_auto_auto_auto_auto] gap-x-2 items-center rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
              >
                <div className="px-1 min-w-0">
                  <p className="font-medium text-foreground line-clamp-2">
                    {p.title}
                  </p>
                  {p.excerpt && (
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">
                      {p.excerpt}
                    </p>
                  )}
                </div>
                <div className="px-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.isPublished
                        ? "bg-success-soft text-success"
                        : "bg-card-muted text-muted"
                    }`}
                  >
                    {p.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="px-1 text-muted tabular-nums">
                  {p.productCount}
                </div>
                <div className="px-1 text-muted whitespace-nowrap text-xs">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString()
                    : "—"}
                </div>
                <div className="px-1 text-muted text-xs truncate max-w-[100px]">
                  {p.createdByName || "—"}
                </div>
                <div className="px-1 flex items-center gap-1">
                  {p.isPublished && (
                    <Link
                      href={`/blog/${p.slug}`}
                      target="_blank"
                      className="admin-icon-btn rounded p-1.5 text-muted"
                      title="View on site"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  )}
                  <Link
                    href={`/admin/blog/${p.id}/edit`}
                    className="admin-icon-btn rounded p-1.5 text-muted"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    title="Delete"
                    className="admin-icon-btn admin-icon-btn--danger rounded p-1.5 text-muted"
                    onClick={async () => {
                      if (!window.confirm(`Delete “${p.title}”?`)) return;
                      await deleteBlogPost(p.id);
                      router.refresh();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </AdminHScroll>

      {posts.length === 0 && (
        <p className="p-8 text-center text-sm text-muted">No blog posts yet.</p>
      )}
    </div>
  );
}

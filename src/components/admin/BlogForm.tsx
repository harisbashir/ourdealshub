"use client";

type ProductOption = { id: string; title: string };

export type BlogFormValues = {
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  productIds: string[];
};

export function BlogForm({
  action,
  post,
  products,
}: {
  action: (formData: FormData) => Promise<void>;
  post?: BlogFormValues;
  products: ProductOption[];
}) {
  const selected = new Set(post?.productIds || []);

  return (
    <form
      action={action}
      className="admin-shell-static max-w-3xl space-y-5 rounded-xl bg-card border border-border p-5 sm:p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Title
        </label>
        <input
          name="title"
          required
          defaultValue={post?.title || ""}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Excerpt (list + SEO)
        </label>
        <input
          name="excerpt"
          defaultValue={post?.excerpt || ""}
          maxLength={400}
          placeholder="Short teaser shown on the blog index…"
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-muted-fg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Cover image URL (optional)
        </label>
        <input
          name="coverImageUrl"
          defaultValue={post?.coverImageUrl || ""}
          placeholder="https://…"
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-muted-fg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Content
        </label>
        <p className="text-xs text-muted mb-2">
          Plain text. Blank line = new paragraph. Write guides or roundups,
          then attach deals below.
        </p>
        <textarea
          name="content"
          required
          rows={14}
          defaultValue={post?.content || ""}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Deals in this post
        </label>
        <p className="text-xs text-muted mb-2">
          Selected deals show as cards on the public post.
        </p>
        {products.length === 0 ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No published products yet — add deals first, then attach them here.
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card-muted p-2 space-y-1">
            {products.map((p) => (
              <label
                key={p.id}
                className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-brand-soft/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="productIds"
                  value={p.id}
                  defaultChecked={selected.has(p.id)}
                  className="mt-0.5 rounded border-border text-brand focus:ring-brand"
                />
                <span className="line-clamp-2">{p.title}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={post?.isPublished ?? false}
          className="rounded border-border text-brand focus:ring-brand"
        />
        Publish on site
      </label>

      <button
        type="submit"
        className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
      >
        {post ? "Save post" : "Create post"}
      </button>
    </form>
  );
}

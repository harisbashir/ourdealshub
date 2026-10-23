"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/utils";
import { isAmazonCdnImageUrl } from "@/lib/affiliate-url";
import { assertAssociatesSafeCopy } from "@/lib/associates-claims";

function normalizeCoverImageUrl(raw: string): string | null {
  const url = raw.trim().slice(0, 2000);
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") {
      throw new Error("Cover image must be an https URL");
    }
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (
      host === "images.unsplash.com" ||
      isAmazonCdnImageUrl(url)
    ) {
      return url;
    }
    throw new Error(
      "Cover image must be from images.unsplash.com or Amazon CDN"
    );
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Cover")) throw e;
    throw new Error("Cover image must be a valid https URL");
  }
}

function parseProductIds(formData: FormData): string[] {
  const raw = formData.getAll("productIds");
  const ids = raw
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, 24);
}

async function uniqueBlogSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || `post-${Date.now().toString(36)}`;
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const existing = await prisma.blogPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
  }
}

export async function createBlogPost(formData: FormData) {
  const admin = await requireSuperAdmin();

  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const excerpt =
    String(formData.get("excerpt") || "").trim().slice(0, 400) || null;
  const content = String(formData.get("content") || "").trim().slice(0, 50000);
  const coverRaw = String(formData.get("coverImageUrl") || "");
  const coverImageUrl = normalizeCoverImageUrl(coverRaw);
  const isPublished = formData.get("isPublished") === "on";
  const productIds = parseProductIds(formData);

  if (!title) throw new Error("Title required");
  if (!content) throw new Error("Content required");

  assertAssociatesSafeCopy({ title, excerpt, content }, "Blog post");

  const slug = await uniqueBlogSlug(title);

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImageUrl,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
      createdById: admin.id,
      products: {
        create: productIds.map((productId, i) => ({
          productId,
          sortOrder: i,
        })),
      },
    },
  });

  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/admin/blog");
  redirect(`/admin/blog/${post.id}/edit`);
}

export async function updateBlogPost(id: string, formData: FormData) {
  await requireSuperAdmin();

  const existing = await prisma.blogPost.findUnique({ where: { id } });
  if (!existing) throw new Error("Post not found");

  const title = String(formData.get("title") || "").trim().slice(0, 200);
  const excerpt =
    String(formData.get("excerpt") || "").trim().slice(0, 400) || null;
  const content = String(formData.get("content") || "").trim().slice(0, 50000);
  const coverRaw = String(formData.get("coverImageUrl") || "");
  const coverImageUrl = normalizeCoverImageUrl(coverRaw);
  const isPublished = formData.get("isPublished") === "on";
  const productIds = parseProductIds(formData);

  if (!title) throw new Error("Title required");
  if (!content) throw new Error("Content required");

  assertAssociatesSafeCopy({ title, excerpt, content }, "Blog post");

  const slug = await uniqueBlogSlug(title, id);
  const publishedAt =
    isPublished && !existing.publishedAt
      ? new Date()
      : isPublished
        ? existing.publishedAt
        : null;

  await prisma.$transaction([
    prisma.blogPostProduct.deleteMany({ where: { blogPostId: id } }),
    prisma.blogPost.update({
      where: { id },
      data: {
        title,
        slug,
        excerpt,
        content,
        coverImageUrl,
        isPublished,
        publishedAt,
        products: {
          create: productIds.map((productId, i) => ({
            productId,
            sortOrder: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  if (existing.slug !== slug) revalidatePath(`/blog/${existing.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/blog");
  redirect(`/admin/blog/${id}/edit`);
}

export async function deleteBlogPost(id: string) {
  await requireSuperAdmin();
  const existing = await prisma.blogPost.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!existing) return;
  await prisma.blogPost.delete({ where: { id } });
  revalidatePath("/blog");
  revalidatePath(`/blog/${existing.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/blog");
}

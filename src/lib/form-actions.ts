"use server";

import { toFormState, type FormState } from "@/lib/form-state";
import {
  createAdminUser,
  createCategory,
  createProduct,
  updateAdminUser,
  updateCategory,
  updateProduct,
} from "@/lib/admin-actions";
import { createBlogPost, updateBlogPost } from "@/lib/blog-actions";

/* useActionState-compatible wrappers: (prevState, formData) → FormState */

export async function createProductForm(_: FormState, fd: FormData) {
  return toFormState(() => createProduct(fd));
}
export async function updateProductForm(id: string, _: FormState, fd: FormData) {
  return toFormState(() => updateProduct(id, fd));
}
export async function createCategoryForm(_: FormState, fd: FormData) {
  return toFormState(() => createCategory(fd));
}
export async function updateCategoryForm(id: string, _: FormState, fd: FormData) {
  return toFormState(() => updateCategory(id, fd));
}
export async function createBlogPostForm(_: FormState, fd: FormData) {
  return toFormState(() => createBlogPost(fd));
}
export async function updateBlogPostForm(id: string, _: FormState, fd: FormData) {
  return toFormState(() => updateBlogPost(id, fd));
}
export async function createAdminUserForm(_: FormState, fd: FormData) {
  return toFormState(() => createAdminUser(fd));
}
export async function updateAdminUserForm(id: string, _: FormState, fd: FormData) {
  return toFormState(() => updateAdminUser(id, fd));
}

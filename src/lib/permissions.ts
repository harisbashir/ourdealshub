export type AdminRole = "SUPER_ADMIN" | "ADMIN";

export type SessionAdmin = {
  id: string;
  email: string;
  role: AdminRole;
  canManageProducts: boolean;
};

export function isSuperAdmin(user: { role?: string } | null | undefined) {
  return user?.role === "SUPER_ADMIN";
}

export function canAccessProducts(user: {
  role?: string;
  canManageProducts?: boolean;
} | null | undefined) {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return !!user.canManageProducts;
}

/** Super Admin sees all; staff only their own (null owner = super-only). */
export function canManageOwnedProduct(
  admin: SessionAdmin | { id: string; role?: string },
  product: { createdById: string | null }
) {
  if (isSuperAdmin(admin)) return true;
  return product.createdById === admin.id;
}

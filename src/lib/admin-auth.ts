import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AdminRole,
  canAccessProducts,
  isSuperAdmin,
  SessionAdmin,
} from "@/lib/permissions";
import { redirect } from "next/navigation";

export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      canManageProducts: true,
    },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role as AdminRole,
    canManageProducts: user.canManageProducts,
  };
}

export async function requireAdminSession(): Promise<SessionAdmin> {
  const admin = await getSessionAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}

export async function requireProductAccess(): Promise<SessionAdmin> {
  const admin = await requireAdminSession();
  if (!canAccessProducts(admin)) {
    redirect("/admin");
  }
  return admin;
}

export async function requireSuperAdmin(): Promise<SessionAdmin> {
  const admin = await requireAdminSession();
  if (!isSuperAdmin(admin)) {
    redirect("/admin");
  }
  return admin;
}

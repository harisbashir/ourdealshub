import type { NextAuthConfig } from "next-auth";
import type { AdminRole } from "@/lib/permissions";

function roleFromToken(auth: { user?: { role?: string; canManageProducts?: boolean } } | null) {
  const role = auth?.user?.role as AdminRole | undefined;
  const canManageProducts = Boolean(auth?.user?.canManageProducts);
  return { role, canManageProducts, isSuper: role === "SUPER_ADMIN" };
}

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    /** Force re-login periodically so revoked/demoted admins cannot linger. */
    maxAge: 60 * 60 * 8,
    updateAge: 60,
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (
        pathname.startsWith("/admin/login") ||
        (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin"))
      ) {
        return true;
      }

      // Cleared by session callback when JWT carries error: "Revoked"
      if (
        !auth?.user ||
        (auth as { error?: string }).error === "Revoked"
      ) {
        return false;
      }

      // Edge-safe path guards using JWT claims (refreshed in Node auth callbacks).
      const { isSuper, canManageProducts } = roleFromToken(auth);

      if (
        pathname.startsWith("/admin/categories") ||
        pathname.startsWith("/admin/admins") ||
        pathname.startsWith("/admin/settings") ||
        pathname.startsWith("/admin/blog") ||
        pathname.startsWith("/admin/automation")
      ) {
        return isSuper;
      }

      if (
        pathname.startsWith("/admin/products") ||
        pathname.startsWith("/admin/analytics") ||
        pathname.startsWith("/admin/insights")
      ) {
        return isSuper || canManageProducts;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: AdminRole }).role;
        token.canManageProducts = (
          user as { canManageProducts?: boolean }
        ).canManageProducts;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error === "Revoked") {
        return {
          ...session,
          user: undefined as never,
          error: "Revoked",
        };
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as AdminRole;
        session.user.canManageProducts = Boolean(token.canManageProducts);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { AdminRole } from "@/lib/permissions";
import { rateLimitDurable } from "@/lib/rate-limit-durable";

const REFRESH_MS = 15_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        // Durable limits (shared across instances) — slow password guessing
        const byEmail = await rateLimitDurable(`login:${email}`, 8, 15 * 60_000);
        const global = await rateLimitDurable(`login:global`, 40, 15 * 60_000);
        if (!byEmail.ok || !global.ok) return null;

        const user = await prisma.adminUser.findUnique({ where: { email } });
        // Always burn similar time even if email is unknown (harder to probe)
        const hash =
          user?.passwordHash ||
          "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquxi.Fs7lqKuAPxhZxK5K";
        let valid = false;
        try {
          valid = await bcrypt.compare(password, hash);
        } catch {
          valid = false;
        }
        if (!user || !user.isActive || !valid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role as AdminRole,
          canManageProducts: user.canManageProducts,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: AdminRole }).role;
        token.canManageProducts = (
          user as { canManageProducts?: boolean }
        ).canManageProducts;
        token.checkedAt = Date.now();
        delete token.error;
        return token;
      }

      if (!token.id) return token;

      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (Date.now() - checkedAt < REFRESH_MS) return token;

      try {
        const dbUser = await prisma.adminUser.findUnique({
          where: { id: String(token.id) },
          select: {
            role: true,
            isActive: true,
            canManageProducts: true,
            email: true,
          },
        });

        if (!dbUser || !dbUser.isActive) {
          return { ...token, error: "Revoked", checkedAt: Date.now() };
        }

        token.role = dbUser.role as AdminRole;
        token.canManageProducts = dbUser.canManageProducts;
        token.email = dbUser.email;
        token.checkedAt = Date.now();
        delete token.error;
      } catch {
        // Keep existing claims if DB briefly unavailable
        token.checkedAt = Date.now();
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
});

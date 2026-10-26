import { recordSystemEvent } from "@/lib/system-events";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { AdminRole } from "@/lib/permissions";
import { rateLimitDurable } from "@/lib/rate-limit-durable";
import { clientIp } from "@/lib/rate-limit";

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
      async authorize(credentials, request) {
        const email = String(credentials?.email || "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        // Durable limits (shared across instances) — slow password guessing.
        // Keyed by IP (+ email) rather than site-wide or email-only, so a
        // stranger spamming bad logins cannot lock real admins out.
        // Requires a proxy that sets X-Real-IP (deploy/Caddyfile does).
        const ip = clientIp(request);
        const byEmailIp = await rateLimitDurable(
          `login:${email}:${ip}`,
          8,
          15 * 60_000
        );
        const byIp = await rateLimitDurable(`login-ip:${ip}`, 30, 15 * 60_000);
        if (!byEmailIp.ok || !byIp.ok) {
          await recordSystemEvent({ category: "security", level: "warning", title: "Sign-in rate limit reached", detail: "Repeated sign-in attempts were blocked. No passwords or submitted credentials are included in this alert.", dedupeKey: `sign-in-limit:${new Date().toISOString().slice(0, 13)}`, adminPath: "/admin/admins" });
          return null;
        }

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

        // Successful sign-in: forget earlier failures for this email + IP so a
        // real admin signing in on several devices never locks themselves out
        await prisma.rateBucket
          .delete({ where: { key: `login:${email}:${ip}` } })
          .catch(() => {});

        await recordSystemEvent({ category: "security", title: "An administrator signed in", adminPath: "/admin/admins" });

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

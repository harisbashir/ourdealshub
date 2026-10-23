import { DefaultSession } from "next-auth";
import type { AdminRole } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
      canManageProducts: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: AdminRole;
    canManageProducts?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AdminRole;
    canManageProducts?: boolean;
    checkedAt?: number;
    error?: string;
  }
}

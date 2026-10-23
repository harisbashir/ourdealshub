"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Sparkles,
  FolderOpen,
  Users,
  Bot,
  Settings,
  ExternalLink,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export type AdminNavKey =
  | "dashboard"
  | "products"
  | "analytics"
  | "insights"
  | "categories"
  | "blog"
  | "admins"
  | "automation"
  | "settings"
  | "site";

const ICONS: Record<AdminNavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  products: Package,
  analytics: BarChart3,
  insights: Sparkles,
  categories: FolderOpen,
  blog: BookOpen,
  admins: Users,
  automation: Bot,
  settings: Settings,
  site: ExternalLink,
};

/** Shorter labels on very narrow viewports so the row wraps less aggressively. */
const SHORT_LABEL: Partial<Record<AdminNavKey, string>> = {
  dashboard: "Home",
  categories: "Cate.",
  automation: "Auto",
  settings: "Config",
  site: "Site",
};

type NavItem = {
  href: string;
  label: string;
  key: AdminNavKey;
  external?: boolean;
};

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="flex flex-wrap gap-1.5 sm:gap-2"
    >
      {items.map((item) => {
        const Icon = ICONS[item.key];
        const short = SHORT_LABEL[item.key];
        const active = item.external
          ? false
          : item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            title={item.label}
            className={`admin-nav-link inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-[11px] sm:text-sm font-medium shadow-sm ${
              active
                ? "admin-nav-link--active border-brand bg-brand text-white shadow-brand/30"
                : "border-border bg-card text-muted"
            }`}
          >
            {Icon ? (
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            ) : null}
            {short && short !== item.label ? (
              <>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </>
            ) : (
              <span>{item.label}</span>
            )}
            {item.external ? (
              <ExternalLink
                className="h-3 w-3 shrink-0 opacity-60"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

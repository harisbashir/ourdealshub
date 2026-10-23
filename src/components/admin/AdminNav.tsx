"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Bot,
  CircleHelp,
  ExternalLink,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Settings,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";

export type AdminNavKey =
  | "dashboard"
  | "products"
  | "add"
  | "analytics"
  | "insights"
  | "categories"
  | "blog"
  | "admins"
  | "automation"
  | "settings"
  | "help"
  | "site";

const ICONS: Record<AdminNavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  products: Package,
  add: PlusCircle,
  analytics: BarChart3,
  insights: Sparkles,
  categories: FolderOpen,
  blog: BookOpen,
  admins: Users,
  automation: Bot,
  settings: Settings,
  help: CircleHelp,
  site: ExternalLink,
};

export type NavItem = {
  href: string;
  label: string;
  key: AdminNavKey;
  external?: boolean;
};

export type NavGroup = { title?: string; items: NavItem[] };

function isActive(pathname: string, item: NavItem) {
  if (item.external) return false;
  if (item.href === "/admin") return pathname === "/admin";
  if (item.key === "products") {
    return pathname === "/admin/products" || /^\/admin\/products\/[^/]+\/edit/.test(pathname);
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="space-y-5">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title && (
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-fg">
              {g.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.key];
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener" : undefined}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium ${
                      active
                        ? "bg-brand-soft text-brand"
                        : "text-foreground hover:bg-card-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {item.external && (
                      <span className="sr-only">(opens in a new tab)</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Account({
  email,
  roleLabel,
  signOut,
}: {
  email: string;
  roleLabel: string;
  signOut: (formData: FormData) => void;
}) {
  return (
    <div className="border-t border-border-subtle pt-3">
      <div className="flex items-center gap-2 px-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{email}</p>
          <p className="text-xs text-muted">{roleLabel}</p>
        </div>
        <ThemeToggle align="left" />
      </div>
      <form action={signOut} className="mt-1">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-foreground hover:bg-card-muted"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          Sign Out
        </button>
      </form>
    </div>
  );
}

/**
 * Admin navigation: persistent sidebar at desktop width; on phones a top bar
 * whose menu button opens the same list in a sheet (HIG › Sidebars adapt).
 */
export function AdminNav({
  groups,
  email,
  roleLabel,
  signOut,
}: {
  groups: NavGroup[];
  email: string;
  roleLabel: string;
  signOut: (formData: FormData) => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const current =
    groups.flatMap((g) => g.items).find((i) => isActive(pathname, i))?.label || "Admin";

  // Close the sheet on navigation
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const menuBtn = menuBtnRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      menuBtn?.focus();
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border-subtle bg-card px-3 py-4 lg:flex">
        <Link href="/admin" className="mb-5 flex items-center gap-2 px-3">
          <BrandMark className="h-8 w-8" />
          <span className="leading-tight">
            <span className="block text-[15px] font-bold text-foreground">OurDealsHub</span>
            <span className="block text-xs text-muted">Admin</span>
          </span>
        </Link>
        <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks groups={groups} />
        </nav>
        <Account email={email} roleLabel={roleLabel} signOut={signOut} />
      </aside>

      {/* Phone / tablet top bar */}
      <header className="bar-material sticky top-0 z-40 border-b border-border-subtle pt-[env(safe-area-inset-top)] lg:hidden">
        <div className="flex h-14 items-center gap-2 px-2">
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open admin menu"
            aria-expanded={open}
            className="pressable inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-card-muted"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-foreground">
            {current}
          </p>
          <ThemeToggle />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col bg-card px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-2xl">
            <div className="mb-3 flex items-center gap-2 px-1">
              <BrandMark className="h-8 w-8" />
              <span className="flex-1 text-[15px] font-bold text-foreground">Admin</span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="pressable inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-card-muted"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto">
              <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
            </nav>
            <Account email={email} roleLabel={roleLabel} signOut={signOut} />
          </div>
        </div>
      )}
    </>
  );
}

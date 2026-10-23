import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import {
  AMAZON_ASSOCIATE_STATEMENT,
  AMAZON_CONTENT_NOTICE,
} from "@/lib/affiliate-disclosure";

const LINKS = [
  { href: "/help", label: "Help" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/disclosure", label: "Affiliate Disclosure" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border-subtle bg-card">
      <div className="site-container py-10">
        <div className="flex items-center gap-2">
          <BrandMark className="h-7 w-7" />
          <span className="text-[17px] font-bold tracking-tight text-foreground">
            OurDealsHub
          </span>
        </div>
        <p className="mt-2 max-w-md text-[15px] text-muted">
          Hand-picked products on Amazon, explained in plain words.
        </p>

        <nav aria-label="Footer" className="mt-6">
          <ul className="-ml-3 flex flex-wrap gap-x-1 gap-y-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex h-10 items-center rounded-full px-3 text-[15px] text-foreground hover:bg-card-muted"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 space-y-2 border-t border-border-subtle pt-6 text-[13px] leading-relaxed text-muted">
          <p>{AMAZON_ASSOCIATE_STATEMENT}</p>
          <p>
            Prices and availability change on Amazon and are shown there. {AMAZON_CONTENT_NOTICE}
          </p>
          <p>© {new Date().getFullYear()} OurDealsHub</p>
        </div>
      </div>
    </footer>
  );
}

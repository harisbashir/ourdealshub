import Link from "next/link";
import { AMAZON_ASSOCIATE_STATEMENT } from "@/lib/affiliate-disclosure";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border-subtle bg-card-muted">
      <div className="site-container py-12">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white font-bold text-sm">
                OD
              </span>
              <span className="font-bold text-foreground">OurDealsHub</span>
            </div>
            <p className="text-sm text-muted max-w-xs">
              Curated Amazon deals, updated daily.
            </p>
            <p className="mt-3 text-xs text-muted-fg max-w-sm leading-relaxed">
              {AMAZON_ASSOCIATE_STATEMENT}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">Links</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/about" className="hover:text-brand font-medium">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-brand font-medium">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand font-medium">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/disclosure" className="hover:text-brand font-medium">
                  Affiliate Disclosure
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-fg">
          © {new Date().getFullYear()} OurDealsHub. All rights reserved.{" "}
          <Link href="/disclosure" className="underline hover:text-brand">
            Disclosure
          </Link>
        </p>
      </div>
    </footer>
  );
}

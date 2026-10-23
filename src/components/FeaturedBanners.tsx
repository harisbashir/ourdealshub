import Link from "next/link";
import Image from "next/image";
import { CategoryIcon } from "@/components/CategoryIcon";

export type FeaturedCategory = {
  name: string;
  slug: string;
  icon?: string;
  imageUrl: string | null;
  badge: string | null;
};

/** Featured category tiles. Text sits on a solid band, never on a photo. */
export function FeaturedBanners({
  categories,
  marketQs = "",
}: {
  categories: FeaturedCategory[];
  marketQs?: string;
}) {
  if (!categories.length) return null;

  return (
    <section className="site-container pt-7 sm:pt-9" aria-labelledby="featured-heading">
      <h2 id="featured-heading" className="text-[22px] font-bold tracking-tight text-foreground sm:text-2xl">
        Shop by Category
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {categories.map((cat) => (
          <li key={cat.slug}>
            <Link
              href={`/category/${cat.slug}${marketQs}`}
              className="pressable group block overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)] ring-1 ring-border-subtle"
            >
              <div className="relative aspect-[4/3] bg-card-muted">
                {cat.imageUrl ? (
                  <Image
                    src={cat.imageUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-brand">
                    <CategoryIcon name={cat.icon || "tag"} className="h-10 w-10" />
                  </div>
                )}
                {cat.badge && (
                  <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-on-brand">
                    {cat.badge}
                  </span>
                )}
              </div>
              <p className="flex min-h-12 items-center px-3 py-2 text-[15px] font-semibold leading-tight text-foreground">
                {cat.name}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

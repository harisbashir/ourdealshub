import Link from "next/link";
import Image from "next/image";

export type FeaturedCategory = {
  name: string;
  slug: string;
  imageUrl: string | null;
  badge: string | null;
};

export function FeaturedBanners({ categories }: { categories: FeaturedCategory[] }) {
  if (!categories.length) return null;

  return (
    <section className="site-container pt-4 sm:pt-6">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
        Shop by category
      </h1>
      <p className="mt-1 text-sm text-muted">
        Curated Amazon product picks. Prices and availability on Amazon.
      </p>

      {/*
        FatKid-style top row: 4 equal landscape cards in one row on desktop.
        No 5th card peek / arrow needed when there are ≤4 featured categories.
      */}
      <div className="mt-4 sm:mt-5">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="feature-banner group relative block w-full overflow-hidden rounded-2xl border border-border shadow-sm aspect-[5/4] min-h-[11.5rem] sm:min-h-[13.5rem] md:min-h-[15rem] lg:min-h-[17rem]"
            >
              {cat.imageUrl ? (
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-300 group-hover:from-black/50" />
              <div
                className="feature-banner-shine pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, transparent 45%, rgba(249,115,22,0.2) 100%)",
                }}
                aria-hidden
              />
              {cat.badge && (
                <span className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 rounded-lg border border-white/30 bg-brand/90 px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-white backdrop-blur-md shadow-sm transition-transform duration-300 group-hover:scale-105">
                  {cat.badge}
                </span>
              )}
              <div className="feature-banner-glass absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3 sm:left-3 sm:right-3 rounded-xl px-3 py-2.5 sm:px-3.5 sm:py-3">
                <h2 className="font-bold text-sm sm:text-base lg:text-lg leading-tight line-clamp-1">
                  {cat.name}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

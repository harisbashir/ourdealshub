-- Category/product deletes must not cascade-wipe the catalog
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_parentId_fkey";
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cron heartbeat on site settings
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "cronLastRunAt" TIMESTAMP(3);
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "cronLastOk" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "cronLastSummary" TEXT;

-- Durable rate-limit buckets (multi-instance safe)
CREATE TABLE IF NOT EXISTS "RateBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateBucket_pkey" PRIMARY KEY ("key")
);

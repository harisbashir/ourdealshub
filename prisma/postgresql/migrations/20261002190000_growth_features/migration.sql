-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "linkStatus" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "linkCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClickEvent" ADD COLUMN IF NOT EXISTS "campaign" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "socialAutoPost" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SocialPostLog" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "externalId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialPostLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_scheduledAt_idx" ON "Product"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Product_isPublished_deletedAt_idx" ON "Product"("isPublished", "deletedAt");
CREATE INDEX IF NOT EXISTS "ClickEvent_campaign_idx" ON "ClickEvent"("campaign");
CREATE INDEX IF NOT EXISTS "SocialPostLog_productId_platform_idx" ON "SocialPostLog"("productId", "platform");
CREATE INDEX IF NOT EXISTS "SocialPostLog_createdAt_idx" ON "SocialPostLog"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "SocialPostLog" ADD CONSTRAINT "SocialPostLog_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

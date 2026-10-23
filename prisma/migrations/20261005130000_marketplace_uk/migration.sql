-- Multi-marketplace (US / UK) support
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "amazonTrackingIdUk" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "marketplace" TEXT NOT NULL DEFAULT 'US';
CREATE INDEX IF NOT EXISTS "Product_marketplace_idx" ON "Product"("marketplace");

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "accentTheme" TEXT NOT NULL DEFAULT 'tangerine';

-- CreateTable
CREATE TABLE "ApiCredential" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCredential_pkey" PRIMARY KEY ("key")
);


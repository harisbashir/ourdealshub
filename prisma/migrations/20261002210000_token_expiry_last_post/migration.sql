-- AlterTable
ALTER TABLE "SocialConnection" ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "SocialConnection" ADD COLUMN "lastPostAt" TIMESTAMP(3);

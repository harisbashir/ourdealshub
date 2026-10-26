-- AlterTable
ALTER TABLE `AdminUser` ADD COLUMN `amazonTrackingIdCa` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `isDemo` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `SocialDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` TEXT NULL,
    `externalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SocialDelivery_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `SocialDelivery_productId_platform_key`(`productId`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SocialDelivery` ADD CONSTRAINT `SocialDelivery_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


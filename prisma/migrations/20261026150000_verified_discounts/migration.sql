ALTER TABLE `Product`
  ADD COLUMN `discountPercent` INTEGER NULL,
  ADD COLUMN `discountBasis` VARCHAR(191) NULL,
  ADD COLUMN `discountFetchedAt` DATETIME(3) NULL,
  ADD COLUMN `discountExpiresAt` DATETIME(3) NULL;

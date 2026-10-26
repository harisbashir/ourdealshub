-- CreateTable
CREATE TABLE `MailSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'gmail',
    `host` VARCHAR(191) NOT NULL DEFAULT 'smtp.gmail.com',
    `port` INTEGER NOT NULL DEFAULT 465,
    `secure` BOOLEAN NOT NULL DEFAULT true,
    `username` VARCHAR(254) NOT NULL DEFAULT '',
    `fromAddress` VARCHAR(254) NOT NULL DEFAULT '',
    `recipient` VARCHAR(254) NOT NULL DEFAULT '',
    `password` TEXT NULL,
    `oauthClientId` VARCHAR(191) NOT NULL DEFAULT '',
    `oauthRefreshToken` TEXT NULL,
    `digestMinutes` INTEGER NOT NULL DEFAULT 5,
    `notifyContent` BOOLEAN NOT NULL DEFAULT true,
    `notifySettings` BOOLEAN NOT NULL DEFAULT true,
    `notifySecurity` BOOLEAN NOT NULL DEFAULT true,
    `notifySocial` BOOLEAN NOT NULL DEFAULT true,
    `notifyOperations` BOOLEAN NOT NULL DEFAULT true,
    `workerToken` VARCHAR(191) NULL,
    `workerLeaseUntil` DATETIME(3) NULL,
    `lastWorkerAt` DATETIME(3) NULL,
    `lastSentAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemEvent` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL DEFAULT 'info',
    `title` VARCHAR(191) NOT NULL,
    `detail` TEXT NULL,
    `adminPath` VARCHAR(191) NOT NULL DEFAULT '/admin',
    `dedupeKey` VARCHAR(191) NULL,
    `mailStatus` VARCHAR(191) NOT NULL DEFAULT 'suppressed',
    `deliveryId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SystemEvent_dedupeKey_key`(`dedupeKey`),
    INDEX `SystemEvent_mailStatus_createdAt_idx`(`mailStatus`, `createdAt`),
    INDEX `SystemEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MailDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(254) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'queued',
    `error` TEXT NULL,
    `messageId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MailDelivery_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MailOAuthAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `deviceCode` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `nextPollAt` DATETIME(3) NOT NULL,
    `intervalSecs` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemMonitor` (
    `key` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SystemEvent` ADD CONSTRAINT `SystemEvent_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `MailDelivery`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


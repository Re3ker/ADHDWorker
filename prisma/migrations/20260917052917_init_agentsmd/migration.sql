-- CreateTable
CREATE TABLE `Settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Europe/Berlin',
    `defaultStartTime` VARCHAR(191) NOT NULL DEFAULT '08:45',
    `telegramChatId` VARCHAR(191) NOT NULL DEFAULT '',
    `startMessageTemplate` TEXT NOT NULL,
    `pauseMessageTemplate` TEXT NOT NULL,
    `resumeMessageTemplate` TEXT NOT NULL,
    `endMessageTemplate` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Workday` (
    `id` VARCHAR(191) NOT NULL,
    `status` ENUM('planned', 'working', 'paused', 'finished', 'cancelled') NOT NULL DEFAULT 'planned',
    `scheduledStartAt` DATETIME(3) NULL,
    `actualStartAt` DATETIME(3) NULL,
    `endedAt` DATETIME(3) NULL,
    `activeKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Workday_activeKey_key`(`activeKey`),
    INDEX `Workday_status_scheduledStartAt_idx`(`status`, `scheduledStartAt`),
    INDEX `Workday_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkSession` (
    `id` VARCHAR(191) NOT NULL,
    `workdayId` VARCHAR(191) NOT NULL,
    `type` ENUM('work', 'break') NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NULL,
    `activeKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WorkSession_activeKey_key`(`activeKey`),
    INDEX `WorkSession_workdayId_type_startedAt_idx`(`workdayId`, `type`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `workSessionId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Task_workSessionId_createdAt_idx`(`workSessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TelegramMessage` (
    `id` VARCHAR(191) NOT NULL,
    `workdayId` VARCHAR(191) NOT NULL,
    `type` ENUM('start', 'pause', 'resume', 'end') NOT NULL,
    `content` TEXT NOT NULL,
    `scheduledFor` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `status` ENUM('pending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    `errorMessage` TEXT NULL,
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TelegramMessage_status_scheduledFor_idx`(`status`, `scheduledFor`),
    INDEX `TelegramMessage_workdayId_type_idx`(`workdayId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WorkSession` ADD CONSTRAINT `WorkSession_workdayId_fkey` FOREIGN KEY (`workdayId`) REFERENCES `Workday`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_workSessionId_fkey` FOREIGN KEY (`workSessionId`) REFERENCES `WorkSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TelegramMessage` ADD CONSTRAINT `TelegramMessage_workdayId_fkey` FOREIGN KEY (`workdayId`) REFERENCES `Workday`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

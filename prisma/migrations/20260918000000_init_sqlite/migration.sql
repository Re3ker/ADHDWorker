CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "defaultStartTime" TEXT NOT NULL DEFAULT '08:45',
    "telegramChatId" TEXT NOT NULL DEFAULT '',
    "telegramBotToken" TEXT NOT NULL DEFAULT '',
    "minimizeOnClose" BOOLEAN NOT NULL DEFAULT true,
    "desktopNotifications" BOOLEAN NOT NULL DEFAULT false,
    "startMessageTemplate" TEXT NOT NULL,
    "pauseMessageTemplate" TEXT NOT NULL,
    "resumeMessageTemplate" TEXT NOT NULL,
    "endMessageTemplate" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Workday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "scheduledStartAt" DATETIME,
    "actualStartAt" DATETIME,
    "endedAt" DATETIME,
    "activeKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Workday_activeKey_key" ON "Workday"("activeKey");
CREATE INDEX "Workday_status_scheduledStartAt_idx" ON "Workday"("status", "scheduledStartAt");
CREATE INDEX "Workday_createdAt_idx" ON "Workday"("createdAt");

CREATE TABLE "WorkSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workdayId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "activeKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkSession_workdayId_fkey" FOREIGN KEY ("workdayId") REFERENCES "Workday" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkSession_activeKey_key" ON "WorkSession"("activeKey");
CREATE INDEX "WorkSession_workdayId_type_startedAt_idx" ON "WorkSession"("workdayId", "type", "startedAt");

CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workSessionId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "WorkSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Task_workSessionId_createdAt_idx" ON "Task"("workSessionId", "createdAt");

CREATE TABLE "TelegramMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workdayId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "lockedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TelegramMessage_workdayId_fkey" FOREIGN KEY ("workdayId") REFERENCES "Workday" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TelegramMessage_status_scheduledFor_idx" ON "TelegramMessage"("status", "scheduledFor");
CREATE INDEX "TelegramMessage_workdayId_type_idx" ON "TelegramMessage"("workdayId", "type");

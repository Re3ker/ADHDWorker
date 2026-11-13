DROP TABLE IF EXISTS "ClockifySyncEntry";

ALTER TABLE "Task" DROP COLUMN "workspaceId";
ALTER TABLE "Task" DROP COLUMN "workspaceName";
ALTER TABLE "Task" DROP COLUMN "projectId";
ALTER TABLE "Task" DROP COLUMN "projectName";
ALTER TABLE "Task" DROP COLUMN "startedAt";
ALTER TABLE "Task" DROP COLUMN "endedAt";

ALTER TABLE "Settings" DROP COLUMN "clockifyApiKey";
ALTER TABLE "Settings" DROP COLUMN "lastClockifyWorkspaceId";
ALTER TABLE "Settings" DROP COLUMN "lastClockifyProjectId";
ALTER TABLE "Settings" DROP COLUMN "timezone";
ALTER TABLE "Settings" RENAME COLUMN "defaultStartTime" TO "startTime";
ALTER TABLE "Settings" ADD COLUMN "pauseTime" TEXT NOT NULL DEFAULT '12:00';
ALTER TABLE "Settings" ADD COLUMN "pauseMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Settings" ADD COLUMN "targetWorkMinutes" INTEGER NOT NULL DEFAULT 480;
ALTER TABLE "Settings" ADD COLUMN "leadMinutes" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Settings" ADD COLUMN "launchAtLogin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Workday" ADD COLUMN "plannedPauseAt" DATETIME;
ALTER TABLE "Workday" ADD COLUMN "pauseMinutes" INTEGER;
ALTER TABLE "Workday" ADD COLUMN "pendingAction" TEXT;
ALTER TABLE "Workday" ADD COLUMN "pendingActionAt" DATETIME;
ALTER TABLE "Workday" ADD COLUMN "pendingMessage" TEXT;

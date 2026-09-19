ALTER TABLE "Settings" ADD COLUMN "clockifyApiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "lastClockifyWorkspaceId" TEXT;
ALTER TABLE "Settings" ADD COLUMN "lastClockifyProjectId" TEXT;

ALTER TABLE "Task" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Task" ADD COLUMN "workspaceName" TEXT;
ALTER TABLE "Task" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Task" ADD COLUMN "projectName" TEXT;
ALTER TABLE "Task" ADD COLUMN "startedAt" DATETIME;
ALTER TABLE "Task" ADD COLUMN "endedAt" DATETIME;

CREATE TABLE "ClockifySyncEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workdayId" TEXT NOT NULL,
  "workSessionId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "startedAt" DATETIME NOT NULL,
  "endedAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "clockifyEntryId" TEXT,
  "errorMessage" TEXT,
  "attemptedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ClockifySyncEntry_workdayId_fkey" FOREIGN KEY ("workdayId") REFERENCES "Workday" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ClockifySyncEntry_workdayId_status_idx" ON "ClockifySyncEntry"("workdayId", "status");
CREATE INDEX "ClockifySyncEntry_status_idx" ON "ClockifySyncEntry"("status");

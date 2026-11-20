CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workdayId" TEXT NOT NULL,
    "part" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_workdayId_fkey" FOREIGN KEY ("workdayId") REFERENCES "Workday" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Task" ("id", "workdayId", "part", "content", "createdAt", "updatedAt")
SELECT "t"."id", "s"."workdayId",
  (SELECT COUNT(*) FROM "WorkSession" AS "w" WHERE "w"."workdayId" = "s"."workdayId" AND "w"."type" = 'work' AND "w"."startedAt" < "s"."startedAt"),
  "t"."content", "t"."createdAt", "t"."updatedAt"
FROM "Task" AS "t" JOIN "WorkSession" AS "s" ON "s"."id" = "t"."workSessionId";

DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_workdayId_part_createdAt_idx" ON "Task"("workdayId", "part", "createdAt");

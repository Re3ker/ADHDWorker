ALTER TABLE "Settings" ADD COLUMN "sendStartImmediately" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "sendPauseImmediately" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "sendResumeImmediately" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN "sendEndImmediately" BOOLEAN NOT NULL DEFAULT false;

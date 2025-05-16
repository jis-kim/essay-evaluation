/*
  Warnings:

  - You are about to drop the column `result` on the `submissions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stats_daily" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "stats_monthly" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "stats_weekly" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "result";

-- AddForeignKey
ALTER TABLE "submission_logs" ADD CONSTRAINT "submission_logs_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `feedback` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `highlight_submit_text` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `highlights` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `submit_text` on the `revisions` table. All the data in the column will be lost.
  - You are about to drop the column `audio_url` on the `submission_media` table. All the data in the column will be lost.
  - You are about to drop the column `video_url` on the `submission_media` table. All the data in the column will be lost.
  - Added the required column `filename` to the `submission_media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `format` to the `submission_media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `submission_media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `submission_media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `submission_media` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'AUDIO');

-- DropIndex
DROP INDEX "submission_media_submission_id_key";

-- AlterTable
ALTER TABLE "revisions" DROP COLUMN "feedback",
DROP COLUMN "highlight_submit_text",
DROP COLUMN "highlights",
DROP COLUMN "result",
DROP COLUMN "score",
DROP COLUMN "status",
DROP COLUMN "submit_text";

-- AlterTable
ALTER TABLE "submission_logs" ADD COLUMN     "result" JSONB;

-- AlterTable
ALTER TABLE "submission_media" DROP COLUMN "audio_url",
DROP COLUMN "video_url",
ADD COLUMN     "filename" VARCHAR(255) NOT NULL,
ADD COLUMN     "format" VARCHAR(32) NOT NULL,
ADD COLUMN     "path" VARCHAR(512) NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "type" "MediaType" NOT NULL;

-- CreateIndex
CREATE INDEX "submission_media_submission_id_idx" ON "submission_media"("submission_id");

/*
  Warnings:

  - You are about to drop the column `path` on the `submission_media` table. All the data in the column will be lost.
  - Added the required column `url` to the `submission_media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "submission_media" DROP COLUMN "path",
ADD COLUMN     "url" VARCHAR(512) NOT NULL;

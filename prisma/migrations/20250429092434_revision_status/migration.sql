-- AlterTable
ALTER TABLE "revisions" ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "RevisionStatus";

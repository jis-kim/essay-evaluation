-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "student_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" INTEGER NOT NULL,
    "component_type" VARCHAR(100) NOT NULL,
    "submit_text" TEXT NOT NULL,
    "highlight_submit_text" TEXT,
    "result" JSONB,
    "score" INTEGER,
    "feedback" VARCHAR(255),
    "highlights" TEXT[],
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_media" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "video_url" VARCHAR(512),
    "audio_url" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "submission_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_logs" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "revision_id" UUID,
    "latency" INTEGER NOT NULL,
    "trace_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisions" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "submit_text" TEXT NOT NULL,
    "highlight_submit_text" TEXT,
    "result" JSONB,
    "score" INTEGER,
    "feedback" VARCHAR(255),
    "highlights" TEXT[],
    "status" "RevisionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_daily" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_weekly" (
    "id" SERIAL NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_weekly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stats_monthly" (
    "id" SERIAL NOT NULL,
    "year_month" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submissions_student_id_idx" ON "submissions"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_student_id_component_type_key" ON "submissions"("student_id", "component_type");

-- CreateIndex
CREATE UNIQUE INDEX "submission_media_submission_id_key" ON "submission_media"("submission_id");

-- CreateIndex
CREATE INDEX "stats_daily_date_idx" ON "stats_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "stats_daily_date_key" ON "stats_daily"("date");

-- CreateIndex
CREATE INDEX "stats_weekly_start_date_idx" ON "stats_weekly"("start_date");

-- CreateIndex
CREATE INDEX "stats_weekly_end_date_idx" ON "stats_weekly"("end_date");

-- CreateIndex
CREATE UNIQUE INDEX "stats_weekly_start_date_key" ON "stats_weekly"("start_date");

-- CreateIndex
CREATE INDEX "stats_monthly_year_month_idx" ON "stats_monthly"("year_month");

-- CreateIndex
CREATE UNIQUE INDEX "stats_monthly_year_month_key" ON "stats_monthly"("year_month");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_media" ADD CONSTRAINT "submission_media_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_logs" ADD CONSTRAINT "submission_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

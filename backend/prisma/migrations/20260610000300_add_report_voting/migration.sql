-- Add community voting for marker reports.
CREATE TABLE IF NOT EXISTS "report_votes" (
  "id" SERIAL NOT NULL,
  "report_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "vote_type" VARCHAR(20) NOT NULL,
  "vote_weight" INTEGER NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "report_votes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "report_votes_vote_type_check" CHECK ("vote_type" IN ('support', 'oppose', 'need_info')),
  CONSTRAINT "report_votes_vote_weight_check" CHECK ("vote_weight" IN (1, 2, 3))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_votes_report_id_fkey'
  ) THEN
    ALTER TABLE "report_votes"
      ADD CONSTRAINT "report_votes_report_id_fkey"
      FOREIGN KEY ("report_id") REFERENCES "reports"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_votes_user_id_fkey'
  ) THEN
    ALTER TABLE "report_votes"
      ADD CONSTRAINT "report_votes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_votes_report_id_user_id_key'
  ) THEN
    ALTER TABLE "report_votes"
      ADD CONSTRAINT "report_votes_report_id_user_id_key"
      UNIQUE ("report_id", "user_id");
  END IF;
END $$;

ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "vote_status" VARCHAR(20) DEFAULT 'voting';
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "vote_deadline" TIMESTAMP(3);
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "support_weight" INTEGER DEFAULT 0;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "oppose_weight" INTEGER DEFAULT 0;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "need_info_count" INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_vote_status_check'
  ) THEN
    ALTER TABLE "reports"
      ADD CONSTRAINT "reports_vote_status_check"
      CHECK ("vote_status" IN ('voting', 'approved', 'rejected', 'disputed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "report_votes_report_id_idx" ON "report_votes"("report_id");
CREATE INDEX IF NOT EXISTS "report_votes_user_id_idx" ON "report_votes"("user_id");
CREATE INDEX IF NOT EXISTS "reports_vote_status_idx" ON "reports"("vote_status");
CREATE INDEX IF NOT EXISTS "reports_vote_deadline_idx" ON "reports"("vote_deadline");

UPDATE "reports"
SET "vote_deadline" = "created_at" + INTERVAL '48 hours',
    "vote_status" = 'voting'
WHERE "status" = 'pending'
  AND "vote_deadline" IS NULL;

-- Store all reporter reasons for a merged report without deleting existing reports.
CREATE TABLE IF NOT EXISTS "report_reasons" (
  "id" SERIAL NOT NULL,
  "report_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "reason" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "report_reasons_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_reasons_report_id_fkey'
  ) THEN
    ALTER TABLE "report_reasons"
      ADD CONSTRAINT "report_reasons_report_id_fkey"
      FOREIGN KEY ("report_id") REFERENCES "reports"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_reasons_user_id_fkey'
  ) THEN
    ALTER TABLE "report_reasons"
      ADD CONSTRAINT "report_reasons_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'report_reasons_report_id_user_id_key'
  ) THEN
    ALTER TABLE "report_reasons"
      ADD CONSTRAINT "report_reasons_report_id_user_id_key"
      UNIQUE ("report_id", "user_id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "report_reasons_report_id_idx" ON "report_reasons"("report_id");
CREATE INDEX IF NOT EXISTS "report_reasons_user_id_idx" ON "report_reasons"("user_id");

INSERT INTO "report_reasons" ("report_id", "user_id", "reason", "description", "created_at")
SELECT "id", "user_id", "reason", NULL, "created_at"
FROM "reports"
WHERE "user_id" IS NOT NULL
ON CONFLICT ("report_id", "user_id") DO NOTHING;

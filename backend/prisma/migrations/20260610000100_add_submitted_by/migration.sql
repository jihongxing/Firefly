-- Add submitter tracking to markers.
ALTER TABLE "markers" ADD COLUMN IF NOT EXISTS "submitted_by" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'markers_submitted_by_fkey'
  ) THEN
    ALTER TABLE "markers"
      ADD CONSTRAINT "markers_submitted_by_fkey"
      FOREIGN KEY ("submitted_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "markers_submitted_by_idx" ON "markers"("submitted_by");

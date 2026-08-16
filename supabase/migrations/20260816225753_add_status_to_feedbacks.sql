DO $$ BEGIN
  CREATE TYPE "public"."feedback_status_enum" AS ENUM ('new', 'in_progress', 'resolved');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS status feedback_status_enum NOT NULL DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_feedbacks_status_created_at
  ON feedbacks (status, created_at DESC);

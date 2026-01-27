DO $$ BEGIN
  CREATE TYPE "public"."feedback_participation_enum" AS ENUM ('never', 'once', 'more_than_once');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  whatsapp text,
  has_participated feedback_participation_enum NOT NULL DEFAULT 'never',
  feedback_text text NOT NULL,
  can_contact boolean NOT NULL DEFAULT false,
  ip_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_email ON feedbacks (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedbacks_whatsapp ON feedbacks (whatsapp) WHERE whatsapp IS NOT NULL;

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

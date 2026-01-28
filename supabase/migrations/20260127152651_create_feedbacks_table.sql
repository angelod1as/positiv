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

-- RLS Policies: Only service_role can access feedbacks (server-side only)
CREATE POLICY service_role_all_access_feedbacks
  ON public.feedbacks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Deny direct client access
CREATE POLICY anon_feedbacks_deny
  ON public.feedbacks FOR ALL TO anon
  USING (false);

CREATE POLICY authenticated_feedbacks_deny
  ON public.feedbacks FOR ALL TO authenticated
  USING (false);

-- WEB-64: the Likert self-assessment, kept with its history. Every time a
-- person answers, a new submission is stored and the older ones stay as they
-- were. Each answer keeps a copy of the statement text the person saw, so
-- editing, removing or adding statements in Sanity never rewrites the past.
--
-- Sensitive data (LGPD art. 5, II): deleting the profile deletes the
-- submissions and their answers. Reached only through Kysely, which checks who
-- may read them, so the API roles get no grants and RLS has no policies.

CREATE TABLE IF NOT EXISTS public.likert_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  been_to text[] NOT NULL,
  non_monogamy_since date CHECK (
    non_monogamy_since IS NULL
    OR extract(day FROM non_monogamy_since) = 1
  )
);

COMMENT ON COLUMN public.likert_submissions.been_to IS
  'Copy of the options picked for "A quais destes você já foi?", as the person saw them.';
COMMENT ON COLUMN public.likert_submissions.non_monogamy_since IS
  'First day of the month the person started living non-monogamy; null means they do not today.';

CREATE INDEX IF NOT EXISTS likert_submissions_profile_id_submitted_at_idx
  ON public.likert_submissions (profile_id, submitted_at DESC);

ALTER TABLE public.likert_submissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.likert_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL
    REFERENCES public.likert_submissions(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position >= 0),
  statement_key text NOT NULL,
  statement_text text NOT NULL,
  answer smallint NOT NULL CHECK (answer BETWEEN 1 AND 5),
  comment text,
  UNIQUE (submission_id, statement_key),
  UNIQUE (submission_id, position)
);

COMMENT ON COLUMN public.likert_answers.statement_text IS
  'Copy of the statement as the person saw it when answering.';
COMMENT ON COLUMN public.likert_answers.answer IS
  '1 Discordo totalmente, 2 Discordo, 3 Depende, 4 Concordo, 5 Concordo totalmente.';

ALTER TABLE public.likert_answers ENABLE ROW LEVEL SECURITY;

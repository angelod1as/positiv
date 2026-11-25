-- The Likert scale ships in two steps (WEB-61). likert_enabled opens the
-- pages to anyone signed in who has the link, with no entry point shown.
-- likert_required shows the entry points and turns on the signup gate
-- (WEB-67); it opens the pages on its own as well.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS likert_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.app_settings.likert_enabled IS
'Whether anyone signed in can open the Likert scale through its link. No
entry point is shown; admins always see it.';

COMMENT ON COLUMN public.app_settings.likert_required IS
'Whether the Likert scale is shown in the account and must be answered
before a first signup. Opens the scale even when likert_enabled is off.';

-- The Likert scale switch (WEB-61). Off hides the scale from everyone but
-- admins, and the signup gate (WEB-67) only asks for the scale while it is on.
-- Starts off: the statements still wait on Ju and the council.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS likert_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.app_settings.likert_enabled IS
'Whether participants see the Likert scale and must answer it before their
first signup. Off shows it only to admins.';

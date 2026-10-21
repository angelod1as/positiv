-- The registration limit moves from a constant in close_registrations_at_limit
-- to a setting an admin changes from /admin/settings. 90 was the hardcoded value.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS registration_limit integer NOT NULL DEFAULT 90
  CHECK (registration_limit > 0);

COMMENT ON COLUMN public.app_settings.registration_limit IS
'How many counted applications close an event''s registrations. Cis het men
apply but are not counted; see get_counted_applied_participants_count.';

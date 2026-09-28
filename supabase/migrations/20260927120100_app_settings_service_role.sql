-- The E2E suite switches online payments on and off through supabase-js, as
-- service_role. That role bypasses RLS but still needs the grant; anon and
-- authenticated get nothing, and the table keeps RLS on with no policy.

GRANT SELECT, INSERT, UPDATE ON TABLE public.app_settings TO service_role;

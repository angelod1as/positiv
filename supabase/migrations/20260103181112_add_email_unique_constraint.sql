-- POS-360: Add UNIQUE constraint on profiles.email
-- This prevents duplicate profiles from being created with the same email.
--
-- PREREQUISITE: Before deploying this migration to production, run the following
-- SQL to clean up existing duplicate emails (keeps the most recent orphaned profile):
--
-- DELETE FROM profiles p
-- USING (
--   SELECT
--     email,
--     MAX(created_at) as max_created_at
--   FROM profiles
--   WHERE user_id IS NULL AND email IS NOT NULL
--   GROUP BY email
--   HAVING COUNT(*) > 1
-- ) AS duplicates
-- WHERE p.email = duplicates.email
--   AND p.user_id IS NULL
--   AND p.created_at < duplicates.max_created_at;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE(email);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

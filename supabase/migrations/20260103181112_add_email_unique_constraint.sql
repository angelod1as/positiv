-- POS-360: Add UNIQUE constraint on profiles.email
-- This prevents duplicate profiles from being created with the same email.
--
-- PREREQUISITE: Before deploying this migration to production, run the following
-- SQL to clean up existing duplicate emails (orphaned profiles with NULL user_id):
--
-- DELETE FROM profiles
-- WHERE user_id IS NULL
--   AND email IN (
--     SELECT email FROM profiles
--     WHERE email IS NOT NULL
--     GROUP BY email HAVING COUNT(*) > 1
--   );

ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE(email);

-- From October 30, 2026 Supabase stops granting anon, authenticated and
-- service_role access to new tables and functions in public on existing
-- projects. Opt in now, so local and CI behave like production and a missing
-- GRANT fails a test instead of a Data API request. Objects that already exist
-- keep the grants they have.
--
-- This goes further than the SQL Supabase publishes for the opt-in, in two ways.
--
-- REVOKE ALL rather than SELECT, INSERT, UPDATE, DELETE: the narrower revoke
-- leaves TRUNCATE, REFERENCES and TRIGGER on tables, and UPDATE on sequences,
-- which is enough to call nextval.
--
-- The PUBLIC revoke on functions carries no IN SCHEMA. PUBLIC's EXECUTE comes
-- from the global default, and a per-schema default can only add to the global
-- one, never take away from it. The IN SCHEMA form, which Supabase publishes and
-- 20260912000001 already ran, leaves every new function executable by anyone.
-- Without IN SCHEMA it also covers functions postgres creates in other schemas.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

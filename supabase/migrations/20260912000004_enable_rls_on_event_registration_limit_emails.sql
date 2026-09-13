-- POS-539: the one table in public that had row level security disabled.
--
-- No policies are added, which blocks every role that RLS applies to. Both
-- writers are exempt:
--
--   * notify_registration_limit_reached is SECURITY DEFINER and the table is
--     owned by postgres, and an owner is not subject to RLS unless the table
--     also declares FORCE ROW LEVEL SECURITY.
--   * /api/admin/send-registration-limit-email writes through service_role,
--     which holds BYPASSRLS.
--
-- anon and authenticated already hold no privilege on the table
-- (20260201130000_add_registration_limit_email_tracking.sql), so this closes
-- the lint rather than an open door — but a table in public with RLS off is one
-- stray GRANT away from being readable, and the dedupe ledger decides whether
-- an admin notification goes out at all.

ALTER TABLE public.event_registration_limit_emails ENABLE ROW LEVEL SECURITY;

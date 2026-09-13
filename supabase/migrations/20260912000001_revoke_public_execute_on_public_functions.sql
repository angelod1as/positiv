-- POS-539: revoke the implicit PUBLIC EXECUTE grant on every function in public.
--
-- Postgres grants EXECUTE to PUBLIC on each newly created function. The earlier
-- migrations in this repository wrote
--
--   REVOKE ALL ON FUNCTION public.add_user_role(uuid, text) FROM anon, authenticated;
--
-- which does not remove that PUBLIC grant, so both roles kept EXECUTE through
-- PUBLIC and every SECURITY DEFINER function stayed callable over PostgREST at
-- /rest/v1/rpc/<name> with the anon key.
--
-- The loop is deliberate rather than one REVOKE per function: production has
-- drifted from these migration files, and a loop over pg_proc converges both
-- regardless of which definition each database currently holds. Functions owned
-- by an extension are left alone.

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    INNER JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'
    )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      target.signature
    );
  END LOOP;
END $$;

-- The two survivors, and why they survive.

-- Called by the browser and the SSR client for the signed-in user's own
-- profile: app/business/auth/auth.client.ts, auth.server.ts, sign-in.server.ts.
GRANT EXECUTE ON FUNCTION public.get_profile_with_roles(uuid) TO authenticated;

-- Called from inside the RLS policies on user_roles and events to break
-- recursion. Every one of those policies is TO authenticated, so anon needs no
-- grant here.
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO authenticated;

COMMENT ON FUNCTION public.get_admin_user_ids() IS
'SECURITY DEFINER function to retrieve the user IDs of all administrators (defined in public.user_roles). Used in RLS policies to break recursion. EXECUTE is granted to authenticated because those policies are TO authenticated; anon has no grant. POS-539.';

-- Stop the next function created in this schema from inheriting the same grants.
-- Supabase ships the anon and authenticated defaults; they are what made every
-- REVOKE above necessary in the first place.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;

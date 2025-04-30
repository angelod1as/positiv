-- Migration: Create get_admin_user_ids function

-- Create or replace a SECURITY DEFINER function to get admin user IDs.
-- This function bypasses RLS when querying user_roles.
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF uuid -- Returns a set of UUIDs (the user_ids of admins)
LANGUAGE sql
SECURITY DEFINER -- *** CRITICAL ***: This makes the query inside bypass RLS
STABLE -- The result is stable within a transaction, but can change between transactions
AS $$
  -- Select the user_id for all entries in user_roles where role_name = 'admin'
  SELECT user_id
  FROM public.user_roles
  WHERE role_name = 'admin';
$$;

-- Set the owner (already postgres due to SECURITY DEFINER)
-- ALTER FUNCTION public.get_admin_user_ids() OWNER TO postgres; -- This is default for SECURITY DEFINER

-- Grant execution permissions (typically needed by roles whose RLS policies will call it)
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.get_admin_user_ids() IS 'SECURITY DEFINER function to retrieve the user IDs of all administrators (defined in public.user_roles). Used in RLS policies to break recursion.';

-- Migration: Fix search_path for multiple functions

-- 1. Fix update_profile_email function
DROP FUNCTION IF EXISTS public.update_profile_email();

CREATE OR REPLACE FUNCTION public.update_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as postgres, necessary to write to public.profiles
SET search_path = public
AS $$
BEGIN
  -- Update the profiles table's email for the corresponding user ID
  -- Uses NEW.email and NEW.id from the row being updated in auth.users
  UPDATE public.profiles
  SET email = new.email
  WHERE id = new.id; -- Match the profile row using the user's ID

  -- Return the new row, allowing the original update operation (email change) to complete
  RETURN new;
END;
$$;

-- Set the owner
ALTER FUNCTION public.update_profile_email() OWNER TO postgres;

-- Grant execution permissions
GRANT ALL ON FUNCTION public.update_profile_email() TO anon;
GRANT ALL ON FUNCTION public.update_profile_email() TO authenticated;
GRANT ALL ON FUNCTION public.update_profile_email() TO service_role;

-- Add a comment for documentation
COMMENT ON FUNCTION public.update_profile_email() IS 'Synchronizes the email in public.profiles with the email in auth.users on update.';

-- 2. Fix get_admin_user_ids function
-- Don't drop the function as other objects depend on it
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF uuid -- Returns a set of UUIDs (the user_ids of admins)
LANGUAGE sql
SECURITY DEFINER -- *** CRITICAL ***: This makes the query inside bypass RLS
SET search_path = public
STABLE -- The result is stable within a transaction, but can change between transactions
AS $$
  -- Select the user_id for all entries in user_roles where role_name = 'admin'
  SELECT user_id
  FROM public.user_roles
  WHERE role_name = 'admin';
$$;

-- Grant execution permissions (typically needed by roles whose RLS policies will call it)
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO anon;
GRANT EXECUTE ON FUNCTION public.get_admin_user_ids() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.get_admin_user_ids() IS 'SECURITY DEFINER function to retrieve the user IDs of all administrators (defined in public.user_roles). Used in RLS policies to break recursion.';

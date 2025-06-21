-- Migration: Canonicalize add_user_role function (rename v2, drop legacy)

-- Drop the legacy function if it exists
DROP FUNCTION IF EXISTS public.add_user_role(uuid, text);

-- Create the new canonical function with safe parameter names
CREATE FUNCTION public.add_user_role(
    p_user_id uuid,
    p_role_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SET search_path = public;

  INSERT INTO public.user_roles (user_id, role_name)
  VALUES (p_user_id, p_role_name)
  ON CONFLICT (user_id, role_name) DO NOTHING;

END;
$$;

ALTER FUNCTION public.add_user_role(uuid, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.add_user_role(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.add_user_role(uuid, text) FROM anon, authenticated;

COMMENT ON FUNCTION public.add_user_role(uuid, text) IS 'SECURITY DEFINER function to add a role to a user in the public.user_roles table. Execution is restricted to privileged roles (e.g., service_role).';

-- Drop the v2 function for cleanliness
DROP FUNCTION IF EXISTS public.add_user_role_v2(uuid, text);

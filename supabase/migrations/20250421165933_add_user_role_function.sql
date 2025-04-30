-- Migration: add_user_role function

-- Create or replace the function
-- This function adds a specific role to a user in the user_roles table.
CREATE OR REPLACE FUNCTION public.add_user_role(
    user_id uuid, -- Input parameter: the ID of the user
    role_name text -- Input parameter: the name of the role to add
)
RETURNS void -- This function performs an action but doesn't return data
LANGUAGE plpgsql
SECURITY DEFINER -- *** ESSENTIAL ***: This allows the function to run with the privileges of the function owner (postgres), bypassing RLS on user_roles. This is needed to add/remove roles even if the caller lacks direct permissions.
AS $$
BEGIN
  -- Set search path
  SET search_path = public;

  -- Attempt to insert the user and role into user_roles.
  -- ON CONFLICT DO NOTHING handles cases where the user already has this role, preventing errors.
  INSERT INTO public.user_roles (user_id, role_name)
  VALUES (add_user_role.user_id, add_user_role.role_name) -- Use function argument names explicitly
  ON CONFLICT (user_id, role_name) DO NOTHING;

  -- No explicit RETURN needed for a VOID function.
END;
$$;

-- Set the owner of the function
ALTER FUNCTION public.add_user_role(uuid, text) OWNER TO postgres;

-- Grant execution permissions
-- Only grant EXECUTE to roles that should be able to add roles (typically service_role for backend/admin tools).
-- DO NOT grant this to anon or authenticated roles for this type of sensitive function.
GRANT ALL ON FUNCTION public.add_user_role(uuid, text) TO service_role;

-- Explicitly revoke if previously granted to ensure a clean state (optional but safe)
REVOKE ALL ON FUNCTION public.add_user_role(uuid, text) FROM anon, authenticated;

-- Update the comment to reflect the restricted access
COMMENT ON FUNCTION public.add_user_role(
    uuid, text
) IS 'SECURITY DEFINER function to add a role to a user in the public.user_roles table. Execution is restricted to privileged roles (e.g., service_role).';

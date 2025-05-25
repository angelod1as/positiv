-- Migration: Fix search_path for more functions
-- This migration updates functions to set search_path in the function definition

-- 1. Fix add_user_role function
CREATE OR REPLACE FUNCTION public.add_user_role(
    user_id uuid, -- Input parameter: the ID of the user
    role_name text -- Input parameter: the name of the role to add
)
RETURNS void -- This function performs an action but doesn't return data
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with the privileges of the function owner (postgres)
SET search_path = public -- Set search path in function definition
AS $$
BEGIN
  -- Attempt to insert the user and role into user_roles.
  -- ON CONFLICT DO NOTHING handles cases where the user already has this role, preventing errors.
  INSERT INTO public.user_roles (user_id, role_name)
  VALUES (add_user_role.user_id, add_user_role.role_name) -- Use function argument names explicitly
  ON CONFLICT (user_id, role_name) DO NOTHING;

  -- No explicit RETURN needed for a VOID function.
END;
$$;

-- 2. Fix get_profile_with_roles function
CREATE OR REPLACE FUNCTION public.get_profile_with_roles(user_id_input uuid)
RETURNS TABLE (
    -- Return columns from profiles table
    id uuid,
    email text,
    full_name text,
    basic_data_filled boolean,
    social_name text,
    pronouns text [],
    rg text,
    cpf text,
    phone bigint,
    date_of_birth date,
    gender text [],
    orientation text [],
    where_lives text,
    how_came_to_us text,
    rg_issuer text,
    allow_marketing_email boolean,
    created_at timestamptz,

    -- Add derived data
    is_admin boolean,
    roles text [] -- Return array of all role names
)
LANGUAGE plpgsql
SECURITY DEFINER -- Function runs with postgres privileges to bypass RLS
SET search_path = public -- Set search path in function definition
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.full_name,
        p.basic_data_filled,
        p.social_name,
        p.pronouns,
        p.rg,
        p.cpf,
        p.phone,
        p.date_of_birth,
        p.gender,
        p.orientation,
        p.where_lives,
        p.how_came_to_us,
        p.rg_issuer,
        p.allow_marketing_email,
        p.created_at,

        -- Check if the user has the 'admin' role
        EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = user_id_input AND ur.role_name = 'admin') AS is_admin,

        -- Aggregate all roles into an array (optional)
        (SELECT array_agg(ur.role_name ORDER BY ur.role_name) FROM user_roles ur WHERE ur.user_id = user_id_input) AS roles

    FROM profiles p
    WHERE p.user_id = user_id_input; -- Filter for the specific user
END;
$$;

-- Preserve permissions and comments for add_user_role
ALTER FUNCTION public.add_user_role(uuid, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.add_user_role(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.add_user_role(uuid, text) FROM anon, authenticated;
COMMENT ON FUNCTION public.add_user_role(uuid, text) IS 'SECURITY DEFINER function to add a role to a user in the public.user_roles table. Execution is restricted to privileged roles (e.g., service_role).';

-- Preserve permissions and comments for get_profile_with_roles
GRANT EXECUTE ON FUNCTION public.get_profile_with_roles(uuid) TO authenticated;
COMMENT ON FUNCTION public.get_profile_with_roles(uuid) IS 'Retrieves a user''s profile along with their role assignments (including isAdmin flag).';

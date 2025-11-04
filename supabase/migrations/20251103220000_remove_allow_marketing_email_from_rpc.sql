-- Remove allow_marketing_email from get_profile_with_roles RPC function
-- This column was dropped from profiles table and replaced with newsletter_subscriptions table

DROP FUNCTION IF EXISTS public.get_profile_with_roles(uuid);

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
    race_color text [],
    where_lives text,
    how_came_to_us text,
    rg_issuer text,
    created_at timestamptz,

    -- Add derived data
    is_admin boolean,
    roles text [] -- Return array of all role names
)
LANGUAGE plpgsql
SECURITY DEFINER -- Function runs with postgres privileges to bypass RLS on profiles/user_roles for the join
AS $$
BEGIN
    -- Set search path
    SET search_path = public;

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
        p.race_color,
        p.where_lives,
        p.how_came_to_us,
        p.rg_issuer,
        p.created_at,

        -- Check if the user has the 'admin' role
        EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = user_id_input AND ur.role_name = 'admin') AS is_admin,

        -- Aggregate all roles into an array (optional)
        (SELECT array_agg(ur.role_name ORDER BY ur.role_name) FROM user_roles ur WHERE ur.user_id = user_id_input) AS roles

    FROM profiles p
    WHERE p.user_id = user_id_input; -- Filter for the specific user

END;
$$;

COMMENT ON FUNCTION public.get_profile_with_roles(
    uuid
) IS 'Retrieves a user''s profile along with their role assignments (including isAdmin flag and race_color). Newsletter preferences managed via newsletter_subscriptions table.';

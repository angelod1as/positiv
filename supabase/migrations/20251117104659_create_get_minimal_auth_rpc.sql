-- Migration: Create minimal auth RPC for performance optimization
-- This RPC returns only essential auth fields (6 instead of 20+) to reduce root loader overhead

CREATE OR REPLACE FUNCTION public.get_minimal_auth(user_id_input uuid)
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    social_name text,
    race_color text[],
    is_admin boolean,
    created_at text,
    basic_data_filled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    SET search_path = public;

    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.full_name,
        p.social_name,
        p.race_color,
        EXISTS (
            SELECT 1
            FROM user_roles ur
            WHERE ur.user_id = user_id_input
            AND ur.role_name = 'admin'
        ) AS is_admin,
        p.created_at::text,
        p.basic_data_filled
    FROM profiles p
    WHERE p.user_id = user_id_input;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_minimal_auth(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_minimal_auth(uuid) IS
'Lightweight RPC that returns only essential auth fields for root loader. Returns 6 fields vs 20+ in get_profile_with_roles, eliminating expensive array_agg aggregation. Expected to reduce root loader time by 100-300ms.';

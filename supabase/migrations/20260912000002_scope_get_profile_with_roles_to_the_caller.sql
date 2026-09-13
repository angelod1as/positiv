-- POS-539: get_profile_with_roles returned any profile to any signed-in user.
--
-- The function is SECURITY DEFINER and takes the user id as an argument, so
-- revoking the grant from anon is not enough: authenticated still needs EXECUTE
-- because the auth clients call it, and without a caller check any signed-in
-- user could pass somebody else's id and read their cpf, rg, phone and date of
-- birth.
--
-- Every call site passes the caller's own id — app/business/auth/auth.client.ts,
-- auth.server.ts and sign-in.server.ts — so the guard costs the application
-- nothing. The body's own `SET search_path = public` is dropped too: it undid
-- the `SET search_path TO ''` on the function, which is the whole point of
-- declaring it. Every reference below is schema-qualified instead.

CREATE OR REPLACE FUNCTION public.get_profile_with_roles(user_id_input uuid)
RETURNS TABLE (
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
    is_admin boolean,
    roles text []
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> user_id_input THEN
        RAISE EXCEPTION
            'get_profile_with_roles only returns the caller''s own profile'
            USING ERRCODE = '42501';
    END IF;

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

        (user_roles_agg.roles IS NOT NULL AND 'admin' = ANY(user_roles_agg.roles)) AS is_admin,

        user_roles_agg.roles

    FROM public.profiles p

    LEFT JOIN LATERAL (
        SELECT array_agg(ur.role_name ORDER BY ur.role_name) AS roles
        FROM public.user_roles ur
        WHERE ur.user_id = user_id_input
    ) user_roles_agg ON true

    WHERE p.user_id = user_id_input;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_profile_with_roles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_with_roles(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_profile_with_roles(uuid) IS
'Returns the calling user''s profile with their roles. Raises insufficient_privilege for any other user id: the function is SECURITY DEFINER and authenticated holds EXECUTE, so the argument cannot be trusted. POS-539.';

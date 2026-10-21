-- POS-628: finish the move to permissions.
--
-- Admin notification recipients are whoever holds notifications.receive_admin,
-- not whoever is called 'admin'. Reading other people's roles asks authorize()
-- like every other policy, so get_admin_user_ids no longer backs a policy and
-- authenticated loses EXECUTE on it. get_profile_with_roles stops returning
-- is_admin: permissions are the only thing the app gates on.

-- 1. Admins receive admin notifications --------------------------------------

INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'notifications.receive_admin')
ON CONFLICT DO NOTHING;

-- 2. get_admin_user_ids: by permission ----------------------------------------

-- CREATE OR REPLACE keeps the function's grants; the revoke below is explicit.
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role_name
  WHERE rp.permission = 'notifications.receive_admin';
$$;

-- 3. Reading other people's roles asks authorize() ----------------------------

DROP POLICY IF EXISTS "combined_authenticated_select_user_roles" ON public.user_roles;

CREATE POLICY "combined_authenticated_select_user_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.authorize('profiles.manage'))
  );

REVOKE ALL ON FUNCTION public.get_admin_user_ids() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.get_admin_user_ids() IS
'The user ids of everyone whose roles hold notifications.receive_admin. No policy calls it, so only the owner and service_role may. POS-628';

-- 4. get_profile_with_roles: no is_admin --------------------------------------

-- Dropping an OUT column means recreating the function, which loses its
-- grants: they are given back below, authenticated only.
DROP FUNCTION IF EXISTS public.get_profile_with_roles(uuid);

CREATE FUNCTION public.get_profile_with_roles(user_id_input uuid)
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
    phone_is_international boolean,
    date_of_birth date,
    gender text [],
    orientation text [],
    race_color text [],
    where_lives text,
    how_came_to_us text,
    rg_issuer text,
    created_at timestamptz,
    roles text [],
    permissions text []
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
        p.phone_is_international,
        p.date_of_birth,
        p.gender,
        p.orientation,
        p.race_color,
        p.where_lives,
        p.how_came_to_us,
        p.rg_issuer,
        p.created_at,

        user_roles_agg.roles,

        permissions_agg.permissions

    FROM public.profiles p

    LEFT JOIN LATERAL (
        SELECT array_agg(ur.role_name::text ORDER BY ur.role_name::text) AS roles
        FROM public.user_roles ur
        WHERE ur.user_id = user_id_input
    ) user_roles_agg ON true

    LEFT JOIN LATERAL (
        SELECT array_agg(DISTINCT rp.permission::text ORDER BY rp.permission::text) AS permissions
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role = ur.role_name
        WHERE ur.user_id = user_id_input
    ) permissions_agg ON true

    WHERE p.user_id = user_id_input;
END;
$$;

REVOKE ALL ON FUNCTION public.get_profile_with_roles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_with_roles(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_profile_with_roles(uuid) IS
'The caller''s own profile with their roles and the permissions those roles grant. POS-628';

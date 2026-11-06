-- WEB-40: a profile an admin has exempted from the CPF, and the columns only an
-- admin may write.
--
-- 1. cpf_exempt marks someone with no CPF -- a foreigner, usually. The profile
--    guard stops asking for one, and payments are taken by hand only, since the
--    provider will not create a customer without it. An exempt profile holds no
--    CPF: a borrowed one is exactly what the exemption replaces.
--
-- 2. The update policy lets a participant write their own row, and a policy
--    cannot tell one column from another. So a participant holding the anon key
--    could approve themselves, mark themselves a veteran, clear the notes an
--    admin keeps about them or point their charges at another provider
--    customer -- and, from now on, exempt themselves from the CPF. A trigger
--    refuses those columns to anon and authenticated unless the caller holds
--    profiles.manage. The server writes through Kysely as the owner, and the
--    e2e helpers as service_role; neither is affected.

-- 1. The column ----------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf_exempt boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.cpf_exempt IS
'Granted by an admin to someone with no CPF. Lifts the CPF from the profile guard; payments are manual only. WEB-40';

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_cpf_exempt_has_no_cpf
    CHECK (NOT cpf_exempt OR regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = '');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Admin-only columns ----------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_admin_only_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  changed text;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated')
     OR public.authorize('profiles.manage') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    changed := CASE
      WHEN NEW.cpf_exempt THEN 'cpf_exempt'
      WHEN NEW.approved_to_attend IS DISTINCT FROM 'pending' THEN 'approved_to_attend'
      WHEN coalesce(NEW.is_veteran, false) THEN 'is_veteran'
      WHEN NEW.became_veteran_date IS NOT NULL THEN 'became_veteran_date'
      WHEN NEW.flag IS DISTINCT FROM 'none' THEN 'flag'
      WHEN NEW.flag_notes IS NOT NULL THEN 'flag_notes'
      WHEN NEW.general_notes IS NOT NULL THEN 'general_notes'
      WHEN NEW.provider_customer_id IS NOT NULL THEN 'provider_customer_id'
    END;
  ELSE
    changed := CASE
      WHEN NEW.cpf_exempt IS DISTINCT FROM OLD.cpf_exempt THEN 'cpf_exempt'
      WHEN NEW.approved_to_attend IS DISTINCT FROM OLD.approved_to_attend THEN 'approved_to_attend'
      WHEN NEW.is_veteran IS DISTINCT FROM OLD.is_veteran THEN 'is_veteran'
      WHEN NEW.became_veteran_date IS DISTINCT FROM OLD.became_veteran_date THEN 'became_veteran_date'
      WHEN NEW.flag IS DISTINCT FROM OLD.flag THEN 'flag'
      WHEN NEW.flag_notes IS DISTINCT FROM OLD.flag_notes THEN 'flag_notes'
      WHEN NEW.general_notes IS DISTINCT FROM OLD.general_notes THEN 'general_notes'
      WHEN NEW.provider_customer_id IS DISTINCT FROM OLD.provider_customer_id THEN 'provider_customer_id'
    END;
  END IF;

  IF changed IS NOT NULL THEN
    RAISE EXCEPTION 'profiles.% is admin-only', changed
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_admin_only_profile_columns() IS
'Refuses the admin-only profile columns to anon and authenticated callers without profiles.manage. WEB-40';

DROP TRIGGER IF EXISTS guard_admin_only_profile_columns ON public.profiles;

CREATE TRIGGER guard_admin_only_profile_columns
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_admin_only_profile_columns();

-- 3. get_profile_with_roles returns cpf_exempt ----------------------------------

-- A new OUT column changes the return type, which CREATE OR REPLACE refuses; the
-- function is dropped and created again, and its grants are given back below.
-- Otherwise the body and grants are those of
-- 20261022100100_permission_based_admin_recipients.sql.
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
    cpf_exempt boolean,
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
        p.cpf_exempt,
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
'The caller''s own profile with their roles and the permissions those roles grant. WEB-40';

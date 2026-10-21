-- POS-516: role-based access control.
--
-- Users -> roles -> permissions. user_roles.role_name becomes the user_role
-- enum, role_permissions maps each role to what it may do, and
-- public.authorize() is the only place that reads the mapping. Every policy
-- that compared role_name = 'admin' now asks authorize() for a permission.
--
-- Postgres refuses to change the type of a column a policy uses, so the 21
-- policies are dropped before the cast and recreated after it. Apart from the
-- admin clause, each keeps its role, command and logic.
--
-- Roles are changed only inside Supabase: authenticated loses every write on
-- user_roles, admins included.

-- 1. Types --------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'staff');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE TYPE public.app_permission AS ENUM (
    'admin.panel',
    'events.manage',
    'participants.manage',
    'profiles.manage',
    'newsletter.manage',
    'reports.read',
    'events.apply_direct'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Drop every policy that reads role_name -----------------------------------

DROP POLICY IF EXISTS "combined_authenticated_select_event_participants" ON public.event_participants;
DROP POLICY IF EXISTS "combined_authenticated_insert_event_participants" ON public.event_participants;
DROP POLICY IF EXISTS "combined_authenticated_update_event_participants" ON public.event_participants;
DROP POLICY IF EXISTS "combined_authenticated_delete_event_participants" ON public.event_participants;

DROP POLICY IF EXISTS "combined_authenticated_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "combined_authenticated_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "combined_authenticated_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "combined_authenticated_delete_profiles" ON public.profiles;

DROP POLICY IF EXISTS "combined_authenticated_select_events" ON public.events;
DROP POLICY IF EXISTS "combined_authenticated_insert_events" ON public.events;
DROP POLICY IF EXISTS "combined_authenticated_update_events" ON public.events;
DROP POLICY IF EXISTS "combined_authenticated_delete_events" ON public.events;

DROP POLICY IF EXISTS "Admins can read event_demographics_history" ON public.event_demographics_history;

DROP POLICY IF EXISTS "Authenticated users can select newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can update newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can insert newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can delete newsletter subscriptions" ON public.newsletter_subscriptions;

DROP POLICY IF EXISTS "Admins can read event_newsletter_campaigns" ON public.event_newsletter_campaigns;
DROP POLICY IF EXISTS "Admins can insert event_newsletter_campaigns" ON public.event_newsletter_campaigns;
DROP POLICY IF EXISTS "Admins can update event_newsletter_campaigns" ON public.event_newsletter_campaigns;
DROP POLICY IF EXISTS "Admins can delete event_newsletter_campaigns" ON public.event_newsletter_campaigns;

-- 3. The cast -----------------------------------------------------------------

ALTER TABLE public.user_roles
  ALTER COLUMN role_name TYPE public.user_role
  USING role_name::public.user_role;

-- 4. Roles are written only from inside Supabase ------------------------------

DROP POLICY IF EXISTS "combined_authenticated_insert_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "combined_authenticated_update_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "combined_authenticated_delete_user_roles" ON public.user_roles;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

-- 5. Role -> permission mapping -----------------------------------------------

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.user_role NOT NULL,
  permission public.app_permission NOT NULL,
  PRIMARY KEY (role, permission)
);

-- No grants and no policies: only authorize() (SECURITY DEFINER) and Kysely,
-- which connects as the owner, read it.
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'admin.panel'),
  ('admin', 'events.manage'),
  ('admin', 'participants.manage'),
  ('admin', 'profiles.manage'),
  ('admin', 'newsletter.manage'),
  ('admin', 'reports.read'),
  ('admin', 'events.apply_direct'),
  ('staff', 'events.apply_direct')
ON CONFLICT DO NOTHING;

-- 6. authorize() --------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.authorize(requested_permission public.app_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role_name
    WHERE ur.user_id = (SELECT auth.uid())
    AND rp.permission = requested_permission
  );
$$;

REVOKE ALL ON FUNCTION public.authorize(public.app_permission) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize(public.app_permission) TO authenticated;

COMMENT ON FUNCTION public.authorize(public.app_permission) IS
'True when one of the caller''s roles holds the permission. Called inside RLS policies, so authenticated needs EXECUTE. POS-516';

-- 7. The policies, back, asking for permissions -------------------------------

CREATE POLICY "combined_authenticated_select_event_participants" ON public.event_participants
  FOR SELECT TO authenticated
  USING (
    profile_id IN (SELECT profiles.id FROM public.profiles WHERE profiles.user_id = (SELECT auth.uid()))
    OR (SELECT public.authorize('participants.manage'))
  );

CREATE POLICY "combined_authenticated_insert_event_participants" ON public.event_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (SELECT profiles.id FROM public.profiles WHERE profiles.user_id = (SELECT auth.uid()))
    OR (SELECT public.authorize('participants.manage'))
  );

CREATE POLICY "combined_authenticated_update_event_participants" ON public.event_participants
  FOR UPDATE TO authenticated
  USING (
    profile_id IN (SELECT profiles.id FROM public.profiles WHERE profiles.user_id = (SELECT auth.uid()))
    OR (SELECT public.authorize('participants.manage'))
  )
  WITH CHECK (
    profile_id IN (SELECT profiles.id FROM public.profiles WHERE profiles.user_id = (SELECT auth.uid()))
    OR (SELECT public.authorize('participants.manage'))
  );

CREATE POLICY "combined_authenticated_delete_event_participants" ON public.event_participants
  FOR DELETE TO authenticated
  USING (
    profile_id IN (SELECT profiles.id FROM public.profiles WHERE profiles.user_id = (SELECT auth.uid()))
    OR (SELECT public.authorize('participants.manage'))
  );

CREATE POLICY "combined_authenticated_select_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.authorize('profiles.manage'))
  );

CREATE POLICY "combined_authenticated_insert_profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.authorize('profiles.manage'))
  );

CREATE POLICY "combined_authenticated_update_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.authorize('profiles.manage'))
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.authorize('profiles.manage'))
  );

CREATE POLICY "combined_authenticated_delete_profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.authorize('profiles.manage'))
  );

CREATE POLICY "combined_authenticated_select_events" ON public.events
  FOR SELECT TO authenticated
  USING (
    event_status = ANY (ARRAY['Registration Open'::public.event_status, 'Scheduled'::public.event_status])
    OR (SELECT public.authorize('events.manage'))
  );

CREATE POLICY "combined_authenticated_insert_events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.authorize('events.manage')));

CREATE POLICY "combined_authenticated_update_events" ON public.events
  FOR UPDATE TO authenticated
  USING ((SELECT public.authorize('events.manage')))
  WITH CHECK ((SELECT public.authorize('events.manage')));

CREATE POLICY "combined_authenticated_delete_events" ON public.events
  FOR DELETE TO authenticated
  USING ((SELECT public.authorize('events.manage')));

CREATE POLICY "Admins can read event_demographics_history" ON public.event_demographics_history
  FOR SELECT TO authenticated
  USING ((SELECT public.authorize('reports.read')));

CREATE POLICY "Authenticated users can select newsletter subscriptions" ON public.newsletter_subscriptions
  FOR SELECT TO authenticated
  USING (
    (SELECT p.user_id FROM public.profiles p WHERE p.id = newsletter_subscriptions.profile_id) = (SELECT auth.uid())
    OR (SELECT public.authorize('newsletter.manage'))
  );

CREATE POLICY "Authenticated users can update newsletter subscriptions" ON public.newsletter_subscriptions
  FOR UPDATE TO authenticated
  USING (
    (SELECT p.user_id FROM public.profiles p WHERE p.id = newsletter_subscriptions.profile_id) = (SELECT auth.uid())
    OR (SELECT public.authorize('newsletter.manage'))
  )
  WITH CHECK (
    (SELECT p.user_id FROM public.profiles p WHERE p.id = newsletter_subscriptions.profile_id) = (SELECT auth.uid())
    OR (SELECT public.authorize('newsletter.manage'))
  );

CREATE POLICY "Admins can insert newsletter subscriptions" ON public.newsletter_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.authorize('newsletter.manage')));

CREATE POLICY "Admins can delete newsletter subscriptions" ON public.newsletter_subscriptions
  FOR DELETE TO authenticated
  USING ((SELECT public.authorize('newsletter.manage')));

CREATE POLICY "Admins can read event_newsletter_campaigns" ON public.event_newsletter_campaigns
  FOR SELECT TO authenticated
  USING ((SELECT public.authorize('newsletter.manage')));

CREATE POLICY "Admins can insert event_newsletter_campaigns" ON public.event_newsletter_campaigns
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.authorize('newsletter.manage')));

CREATE POLICY "Admins can update event_newsletter_campaigns" ON public.event_newsletter_campaigns
  FOR UPDATE TO authenticated
  USING ((SELECT public.authorize('newsletter.manage')))
  WITH CHECK ((SELECT public.authorize('newsletter.manage')));

CREATE POLICY "Admins can delete event_newsletter_campaigns" ON public.event_newsletter_campaigns
  FOR DELETE TO authenticated
  USING ((SELECT public.authorize('newsletter.manage')));

-- 8. add_user_role: text in, enum stored --------------------------------------

-- A text value is not assigned to an enum column implicitly, so the body casts.
-- CREATE OR REPLACE keeps the service_role-only grant.
CREATE OR REPLACE FUNCTION public.add_user_role(p_user_id uuid, p_role_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role_name)
  VALUES (p_user_id, p_role_name::public.user_role)
  ON CONFLICT (user_id, role_name) DO NOTHING;
END;
$$;

-- 9. get_profile_with_roles: also returns permissions -------------------------

-- A new OUT column cannot be added in place, so the function is recreated and
-- loses its grants: they are given back below, authenticated only.
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
    is_admin boolean,
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

        (user_roles_agg.roles IS NOT NULL AND 'admin' = ANY(user_roles_agg.roles)) AS is_admin,

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
'The caller''s own profile with their roles and the permissions those roles grant. POS-516';

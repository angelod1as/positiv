-- Migration: Fix multiple permissive policies
-- This migration combines multiple permissive policies for the same role and action
-- into a single policy to improve performance

-- 1. Fix event_participants table policies

-- Drop the existing policies for authenticated users
DROP POLICY IF EXISTS authenticated_select_own_participation ON public.event_participants;
DROP POLICY IF EXISTS authenticated_insert_own_participation ON public.event_participants;
DROP POLICY IF EXISTS authenticated_update_own_participation ON public.event_participants;
DROP POLICY IF EXISTS authenticated_delete_own_participation ON public.event_participants;
DROP POLICY IF EXISTS admin_all_access_event_participants ON public.event_participants;

-- Create combined policies for authenticated users
CREATE POLICY combined_authenticated_select_event_participants
ON public.event_participants FOR SELECT
TO authenticated
USING (
    -- User can select their own participation records
    (profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = (SELECT auth.uid())
    ))
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
);

CREATE POLICY combined_authenticated_insert_event_participants
ON public.event_participants FOR INSERT
TO authenticated
WITH CHECK (
    -- User can insert their own participation records
    (profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = (SELECT auth.uid())
    ))
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
);

CREATE POLICY combined_authenticated_update_event_participants
ON public.event_participants FOR UPDATE
TO authenticated
USING (
    -- User can update their own participation records
    (profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = (SELECT auth.uid())
    ))
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
)
WITH CHECK (
    -- User can update their own participation records
    (profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = (SELECT auth.uid())
    ))
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
);

CREATE POLICY combined_authenticated_delete_event_participants
ON public.event_participants FOR DELETE
TO authenticated
USING (
    -- User can delete their own participation records
    (profile_id IN (
        SELECT id FROM public.profiles
        WHERE user_id = (SELECT auth.uid())
    ))
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
);

-- Add comments for the new policies
COMMENT ON POLICY combined_authenticated_select_event_participants ON public.event_participants IS 'Allow authenticated users to select their own event participation records, and admins to select all records.';
COMMENT ON POLICY combined_authenticated_insert_event_participants ON public.event_participants IS 'Allow authenticated users to insert participation records linked to their own profile, and admins to insert any records.';
COMMENT ON POLICY combined_authenticated_update_event_participants ON public.event_participants IS 'Allow authenticated users to update their own event participation records, and admins to update any records.';
COMMENT ON POLICY combined_authenticated_delete_event_participants ON public.event_participants IS 'Allow authenticated users to delete their own event participation records, and admins to delete any records.';

-- 2. Fix events table policies

-- Drop the existing policies for anon and authenticated users
DROP POLICY IF EXISTS anon_select_public_events ON public.events;
DROP POLICY IF EXISTS anon_deny_all_other_events ON public.events;
DROP POLICY IF EXISTS authenticated_select_limited_events ON public.events;
DROP POLICY IF EXISTS admin_all_access_events ON public.events;

-- Create combined policies
CREATE POLICY combined_anon_select_events
ON public.events FOR SELECT
TO anon
USING (event_status IN ('Registration Open', 'Scheduled'));

CREATE POLICY combined_anon_all_other_events
ON public.events FOR ALL
TO anon
USING (false) WITH CHECK (false);

CREATE POLICY combined_authenticated_select_events
ON public.events FOR SELECT
TO authenticated
USING (
    -- Regular users can see events with specific statuses
    event_status IN ('Registration Open', 'Scheduled')
    -- OR user is an admin (can see all events)
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
);

CREATE POLICY combined_authenticated_insert_events
ON public.events FOR INSERT
TO authenticated
WITH CHECK (
    -- Only admins can insert events
    (SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    )
);

CREATE POLICY combined_authenticated_update_events
ON public.events FOR UPDATE
TO authenticated
USING (
    -- Only admins can update events
    (SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    )
)
WITH CHECK (
    -- Only admins can update events
    (SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    )
);

CREATE POLICY combined_authenticated_delete_events
ON public.events FOR DELETE
TO authenticated
USING (
    -- Only admins can delete events
    (SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    )
);

-- Add comments for the new policies
COMMENT ON POLICY combined_anon_select_events ON public.events IS 'Allow anonymous users to select events with specific statuses.';
COMMENT ON POLICY combined_anon_all_other_events ON public.events IS 'Deny anonymous users all other operations on events.';
COMMENT ON POLICY combined_authenticated_select_events ON public.events IS 'Allow authenticated users to select events with specific statuses, and admins to select all events.';
COMMENT ON POLICY combined_authenticated_insert_events ON public.events IS 'Allow admin users to insert events.';
COMMENT ON POLICY combined_authenticated_update_events ON public.events IS 'Allow admin users to update events.';
COMMENT ON POLICY combined_authenticated_delete_events ON public.events IS 'Allow admin users to delete events.';

-- 3. Fix profiles table policies

-- Drop the existing policies for authenticated users
DROP POLICY IF EXISTS authenticated_select_own_profiles ON public.profiles;
DROP POLICY IF EXISTS authenticated_update_own_profiles ON public.profiles;
DROP POLICY IF EXISTS authenticated_insert_own_profiles ON public.profiles;
DROP POLICY IF EXISTS authenticated_delete_own_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_select_all_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_insert_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_update_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_delete_profiles ON public.profiles;

-- Create combined policies for authenticated users
CREATE POLICY combined_authenticated_select_profiles
ON public.profiles FOR SELECT
TO authenticated
USING (
    -- User can select their own profile
    ((SELECT auth.uid()) = user_id)
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
);

CREATE POLICY combined_authenticated_insert_profiles
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
    -- User can insert their own profile
    ((SELECT auth.uid()) = user_id)
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
);

CREATE POLICY combined_authenticated_update_profiles
ON public.profiles FOR UPDATE
TO authenticated
USING (
    -- User can update their own profile
    ((SELECT auth.uid()) = user_id)
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
)
WITH CHECK (
    -- User can update their own profile
    ((SELECT auth.uid()) = user_id)
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
);

CREATE POLICY combined_authenticated_delete_profiles
ON public.profiles FOR DELETE
TO authenticated
USING (
    -- User can delete their own profile
    ((SELECT auth.uid()) = user_id)
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (
        SELECT user_id FROM public.user_roles
        WHERE role_name = 'admin'
    ))
);

-- Add comments for the new policies
COMMENT ON POLICY combined_authenticated_select_profiles ON public.profiles IS 'Allow authenticated users to read their own profile, and admins to read any profile.';
COMMENT ON POLICY combined_authenticated_insert_profiles ON public.profiles IS 'Allow authenticated users to insert their own profile, and admins to insert any profile.';
COMMENT ON POLICY combined_authenticated_update_profiles ON public.profiles IS 'Allow authenticated users to update their own profile, and admins to update any profile.';
COMMENT ON POLICY combined_authenticated_delete_profiles ON public.profiles IS 'Allow authenticated users to delete their own profile, and admins to delete any profile.';

-- 4. Fix user_roles table policies

-- Drop the existing policies for authenticated users
DROP POLICY IF EXISTS authenticated_select_own_user_roles ON public.user_roles;
DROP POLICY IF EXISTS authenticated_insert_user_roles_deny ON public.user_roles;
DROP POLICY IF EXISTS authenticated_update_user_roles_deny ON public.user_roles;
DROP POLICY IF EXISTS authenticated_delete_user_roles_deny ON public.user_roles;
DROP POLICY IF EXISTS admin_select_all_user_roles ON public.user_roles;
DROP POLICY IF EXISTS admin_insert_user_roles ON public.user_roles;
DROP POLICY IF EXISTS admin_update_user_roles ON public.user_roles;
DROP POLICY IF EXISTS admin_delete_user_roles ON public.user_roles;

-- Create combined policies for authenticated users
CREATE POLICY combined_authenticated_select_user_roles
ON public.user_roles FOR SELECT
TO authenticated
USING (
    -- User can select their own roles
    ((SELECT auth.uid()) = user_id)
    -- OR user is an admin
    OR ((SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids()))
);

CREATE POLICY combined_authenticated_insert_user_roles
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
    -- Only admins can insert roles
    (SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids())
);

CREATE POLICY combined_authenticated_update_user_roles
ON public.user_roles FOR UPDATE
TO authenticated
USING (
    -- Only admins can update roles
    (SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids())
)
WITH CHECK (
    -- Only admins can update roles
    (SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids())
);

CREATE POLICY combined_authenticated_delete_user_roles
ON public.user_roles FOR DELETE
TO authenticated
USING (
    -- Only admins can delete roles
    (SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids())
);

-- Add comments for the new policies
COMMENT ON POLICY combined_authenticated_select_user_roles ON public.user_roles IS 'Allow authenticated users to read their own role assignments, and admins to read all role assignments.';
COMMENT ON POLICY combined_authenticated_insert_user_roles ON public.user_roles IS 'Allow admin users to insert role assignments.';
COMMENT ON POLICY combined_authenticated_update_user_roles ON public.user_roles IS 'Allow admin users to update role assignments.';
COMMENT ON POLICY combined_authenticated_delete_user_roles ON public.user_roles IS 'Allow admin users to delete role assignments.';

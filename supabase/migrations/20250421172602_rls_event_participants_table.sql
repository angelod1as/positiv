-- Migration: RLS for public.event_participants table

-- 1. Enable Row Level Security
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS Policies

-- ### Policies for Anonymous Users (Deny Access) ###
-- Anonymous users should not access participation records.

CREATE POLICY anon_all_event_participants_deny
ON public.event_participants FOR ALL -- Deny all operations (SELECT, INSERT, UPDATE, DELETE)
TO anon
USING (false) WITH CHECK (false); -- Always deny


-- ### Policies for Authenticated Users (Regular Users - Manage Their Own Participation) ###
-- Authenticated users can manage their own participation records.

-- Condition to check if the participation record belongs to the current authenticated user's profile
-- We need to find the authenticated user's profile ID.
-- Condition: (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))

-- Allow authenticated users to SELECT (read) their OWN participation records
CREATE POLICY authenticated_select_own_participation
ON public.event_participants FOR SELECT
TO authenticated
-- Policy passes if the profile_id matches the ID of the logged-in user's profile
USING (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
));

-- Comment for the policy
COMMENT ON POLICY authenticated_select_own_participation ON public.event_participants IS 'Allow authenticated users to select their own event participation records.';


-- Allow authenticated users to INSERT their OWN participation records
CREATE POLICY authenticated_insert_own_participation
ON public.event_participants FOR INSERT
TO authenticated
-- Policy passes if the profile_id in the NEW row matches the ID of the logged-in user's profile
WITH CHECK (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
));

-- Comment for the policy
COMMENT ON POLICY authenticated_insert_own_participation ON public.event_participants IS 'Allow authenticated users to insert participation records linked to their own profile.';


-- Allow authenticated users to UPDATE their OWN participation records
CREATE POLICY authenticated_update_own_participation
ON public.event_participants FOR UPDATE
TO authenticated
-- USING checks the existing row, WITH CHECK checks the new row data
-- Can update rows belonging to their profile
USING (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
))
-- Ensure the updated row still belongs to their profile
WITH CHECK (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
));

-- Comment for the policy
COMMENT ON POLICY authenticated_update_own_participation ON public.event_participants IS 'Allow authenticated users to update their own event participation records.';


-- Allow authenticated users to DELETE their OWN participation records
CREATE POLICY authenticated_delete_own_participation
ON public.event_participants FOR DELETE
TO authenticated
-- Policy passes if the profile_id belongs to the logged-in user's profile
USING (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
));

-- Comment for the policy
COMMENT ON POLICY authenticated_delete_own_participation ON public.event_participants IS 'Allow authenticated users to delete their own event participation records.';


-- ### Policies for Admin Users and service_role (Full Access) ###
-- Admin users and the service_role have complete control over participation records.

-- Check if the current user is an admin (using the user_roles table)
-- Condition: (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role_name = 'admin'))

CREATE POLICY admin_all_access_event_participants
ON public.event_participants FOR ALL -- Grants SELECT, INSERT, UPDATE, DELETE permissions
TO authenticated -- Applies to authenticated users
-- Condition: True if the logged-in user is an admin
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
))
-- Apply same check for insert/update data
WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
));

-- Comment for the policy
COMMENT ON POLICY admin_all_access_event_participants ON public.event_participants IS 'Allow admin users (defined in user_roles) full access to all event participation records.';


-- The service_role has full access to manage participation records for backend operations
CREATE POLICY service_role_all_access_event_participants
ON public.event_participants FOR ALL
TO service_role
USING (true) WITH CHECK (true); -- Always true for the service_role

-- Comment for the policy
COMMENT ON POLICY service_role_all_access_event_participants ON public.event_participants IS 'Allow service_role full access to event participation records.';


-- Add comment for the table
COMMENT ON TABLE public.event_participants IS 'Tracks participation of profiles in events. RLS allows users to manage their own records and admins to manage all.';

-- Migration: RLS for public.events table

-- 1. Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS Policies

-- ### Policies for Anonymous Users (Limited Read Access) ###
-- Anonymous users can only select events with specific statuses.

CREATE POLICY anon_select_public_events
ON public.events FOR SELECT
TO anon
-- Only allow selecting rows where event_status is one of these values
USING (event_status IN ('Registration Open', 'Scheduled'));

CREATE POLICY anon_deny_all_other_events
ON public.events FOR ALL
TO anon
-- Deny all other operations (INSERT, UPDATE, DELETE) for anonymous users
-- and deny SELECT for events not matching the status condition
USING (false) WITH CHECK (false);


-- ### Policies for Authenticated Users (Regular Users - Limited Read Access, SAME AS ANON SELECT) ###
-- Authenticated users can see the same public-facing events as anonymous users by default.
-- They cannot directly manage events (insert/update/delete).

-- Allow authenticated users to SELECT (read) events with specific statuses
-- This now matches the condition for anonymous users.
CREATE POLICY authenticated_select_limited_events
ON public.events FOR SELECT
TO authenticated
-- Only allow selecting rows where event_status is one of these values
USING (event_status IN ('Registration Open', 'Scheduled'));

-- ### Policies for Admin Users and service_role (Full Access) ###
-- Admin users and the service_role have complete control over event records.

-- Check if the current user is an admin (using the user_roles table)
-- Condition: (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role_name = 'admin'))

CREATE POLICY admin_all_access_events
ON public.events FOR ALL -- Grants SELECT, INSERT, UPDATE, DELETE permissions
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

-- The service_role has full access to manage events for backend operations
CREATE POLICY service_role_all_access_events
ON public.events FOR ALL -- Grants SELECT, INSERT, UPDATE, DELETE permissions
TO service_role
USING (true) WITH CHECK (true); -- Always true for the service_role


COMMENT ON POLICY service_role_all_access_events ON public.events IS 'Allow service_role full access to events.';
COMMENT ON TABLE public.events IS 'Stores information about events. RLS restricts visibility by status for anonymous and non-admin authenticated users, granting full access to admins.';

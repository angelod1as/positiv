-- ROO: REVIEW
-- Migration: RLS for public.event_reminders table

-- 1. Enable Row Level Security
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS Policies

-- ### Policies for Anonymous Users (Deny Access) ###
-- Anonymous users should not access event reminders.

CREATE POLICY anon_all_event_reminders_deny
ON public.event_reminders FOR ALL
TO anon
USING (false) WITH CHECK (false);

-- ### Policies for Authenticated Users (Regular Users - Manage Their Own Reminders) ###
-- Authenticated users can see, create, and delete their own reminders.

-- Allow authenticated users to SELECT (read) their OWN reminders
CREATE POLICY authenticated_select_own_reminder
ON public.event_reminders FOR SELECT
TO authenticated
USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON POLICY authenticated_select_own_reminder ON public.event_reminders IS 'Allow authenticated users to select their own event reminders.';

-- Allow authenticated users to INSERT their OWN reminders
CREATE POLICY authenticated_insert_own_reminder
ON public.event_reminders FOR INSERT
TO authenticated
WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON POLICY authenticated_insert_own_reminder ON public.event_reminders IS 'Allow authenticated users to insert their own event reminders.';

-- Allow authenticated users to DELETE their OWN reminders
CREATE POLICY authenticated_delete_own_reminder
ON public.event_reminders FOR DELETE
TO authenticated
USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON POLICY authenticated_delete_own_reminder ON public.event_reminders IS 'Allow authenticated users to delete their own event reminders.';

-- ### Policies for Admin Users and service_role (Full Access) ###
-- Admin users and the service_role have complete control over event reminders.
CREATE POLICY admin_all_access_event_reminders
ON public.event_reminders FOR ALL
TO authenticated
USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role_name = 'admin'))
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role_name = 'admin'));

COMMENT ON POLICY admin_all_access_event_reminders ON public.event_reminders IS 'Allow admin users full access to all event reminders.';

-- The service_role has full access to manage event reminders
CREATE POLICY service_role_all_access_event_reminders
ON public.event_reminders FOR ALL
TO service_role
USING (true) WITH CHECK (true);

COMMENT ON POLICY service_role_all_access_event_reminders ON public.event_reminders IS 'Allow service_role full access to event reminders.';

-- Add comment for the table
COMMENT ON TABLE public.event_reminders IS 'Tracks event reminders for users. RLS allows users to manage their own records and admins to manage all.';
-- ROO: REVIEW END

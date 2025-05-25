-- Migration: Fix RLS policies for better performance
-- This migration updates RLS policies to avoid re-evaluating auth.uid() for each row
-- by replacing auth.uid() with (SELECT auth.uid())

-- 1. Fix profiles table policies

-- Fix authenticated_select_own_profiles
ALTER POLICY authenticated_select_own_profiles
ON public.profiles
USING ((SELECT auth.uid()) = user_id);

-- Fix authenticated_update_own_profiles
ALTER POLICY authenticated_update_own_profiles
ON public.profiles
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix authenticated_insert_own_profiles
ALTER POLICY authenticated_insert_own_profiles
ON public.profiles
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Fix authenticated_delete_own_profiles
ALTER POLICY authenticated_delete_own_profiles
ON public.profiles
USING ((SELECT auth.uid()) = user_id);

-- Fix admin_select_all_profiles
ALTER POLICY admin_select_all_profiles
ON public.profiles
USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
));

-- Fix admin_insert_profiles
ALTER POLICY admin_insert_profiles
ON public.profiles
WITH CHECK ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
));

-- Fix admin_update_profiles
ALTER POLICY admin_update_profiles
ON public.profiles
USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
));

-- Fix admin_delete_profiles
ALTER POLICY admin_delete_profiles
ON public.profiles
USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
));

-- 2. Fix user_roles table policies

-- Fix authenticated_select_own_user_roles
ALTER POLICY authenticated_select_own_user_roles
ON public.user_roles
USING ((SELECT auth.uid()) = user_id);

-- Fix admin_select_all_user_roles
ALTER POLICY admin_select_all_user_roles
ON public.user_roles
USING ((SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids()));

-- Fix admin_insert_user_roles
ALTER POLICY admin_insert_user_roles
ON public.user_roles
WITH CHECK ((SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids()));

-- Fix admin_update_user_roles
ALTER POLICY admin_update_user_roles
ON public.user_roles
USING ((SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids()))
WITH CHECK ((SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids()));

-- Fix admin_delete_user_roles
ALTER POLICY admin_delete_user_roles
ON public.user_roles
USING ((SELECT auth.uid()) IN (SELECT * FROM public.get_admin_user_ids()));

-- 3. Fix events table policies

-- Fix admin_all_access_events
ALTER POLICY admin_all_access_events
ON public.events
USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
))
WITH CHECK ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
));

-- 4. Fix event_participants table policies

-- Fix authenticated_select_own_participation
ALTER POLICY authenticated_select_own_participation
ON public.event_participants
USING (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = (SELECT auth.uid())
));

-- Fix authenticated_insert_own_participation
ALTER POLICY authenticated_insert_own_participation
ON public.event_participants
WITH CHECK (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = (SELECT auth.uid())
));

-- Fix authenticated_update_own_participation
ALTER POLICY authenticated_update_own_participation
ON public.event_participants
USING (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = (SELECT auth.uid())
))
WITH CHECK (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = (SELECT auth.uid())
));

-- Fix authenticated_delete_own_participation
ALTER POLICY authenticated_delete_own_participation
ON public.event_participants
USING (profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = (SELECT auth.uid())
));

-- Fix admin_all_access_event_participants
ALTER POLICY admin_all_access_event_participants
ON public.event_participants
USING ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
))
WITH CHECK ((SELECT auth.uid()) IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
));

-- Migration: RLS for public.profiles table

-- 1. Enable Row Level Security on the profiles table
-- This activates the RLS feature. By default, without policies, access is denied.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS Policies

-- ### Policies for Anonymous Users (Deny Access to User Data) ###
-- Anonymous users typically should not access individual user profiles.

CREATE POLICY anon_read_profiles_deny
ON public.profiles FOR SELECT
TO anon
USING (false); -- Explicitly deny anonymous read access

CREATE POLICY anon_insert_profiles_deny
ON public.profiles FOR INSERT
TO anon
WITH CHECK (false); -- Deny anonymous insert access

CREATE POLICY anon_update_profiles_deny
ON public.profiles FOR UPDATE
TO anon
USING (false) WITH CHECK (false); -- Deny anonymous update access

CREATE POLICY anon_delete_profiles_deny
ON public.profiles FOR DELETE
TO anon
USING (false); -- Deny anonymous delete access

-- ### Policies for Authenticated Users (Regular Users - Manage Their Own Profile) ###
-- Authenticated users can typically read and update their own profile information.

-- Allow authenticated users to SELECT (read) their OWN profile
-- Users can see rows where the profile's user_id matches their authenticated user ID (auth.uid()).
CREATE POLICY authenticated_select_own_profiles
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id); -- Policy passes if the profile's user_id matches the logged-in user's ID

-- Allow authenticated users to UPDATE their OWN profile
-- USING checks the existing row (auth.uid() = user_id).
-- WITH CHECK ensures the new row data still satisfies a condition - here, just that it's their own row.
-- Note: Updating the role column is handled via the add_user_role function and RLS on user_roles.
CREATE POLICY authenticated_update_own_profiles
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id) -- User can update rows where user_id matches their own ID
WITH CHECK (auth.uid() = user_id); -- Ensure they only update their own row

-- Allow authenticated users to INSERT a profile (less common, signup trigger handles)
-- Policy passes if the new row's user_id matches the logged-in user's ID.
-- The create_profile_on_signup trigger bypasses RLS by running as SECURITY DEFINER.
-- This policy applies if an authenticated user tries a direct insert (e.g., via the API).
CREATE POLICY authenticated_insert_own_profiles
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to DELETE their OWN profile
CREATE POLICY authenticated_delete_own_profiles
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id); -- User can delete rows where user_id matches their own ID

-- ### Policies for Admin Users (Authenticated Users listed as 'admin' in user_roles) ###
-- These policies grant broader access to users who are admins.
-- RLS policies combine with OR: if ANY policy allows the action for a row/user, it's permitted.

-- Check if the current user is an admin using the user_roles table
-- This subquery checks if the authenticated user's ID exists in the set of user_ids
-- from the user_roles table where the role_name is 'admin'.
-- We'll use this condition in the admin policies.
-- Condition: (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role_name = 'admin'))

-- Allow admin users to SELECT any profile
CREATE POLICY admin_select_all_profiles
ON public.profiles FOR SELECT
TO authenticated -- Applies to authenticated users
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
)); -- Condition: True if the logged-in user is an admin

-- Allow admin users to INSERT any profile
-- Admins can insert profiles with any user_id.
CREATE POLICY admin_insert_profiles
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
)); -- Condition: True if the logged-in user is an admin

-- Allow admin users to UPDATE any profile
-- Admins can update any row (USING TRUE, or implicitly by the admin check) and set any values.
CREATE POLICY admin_update_profiles
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
)); -- Condition: True if the logged-in user is an admin
-- You could add a WITH CHECK if there are restrictions on what admins can set, but usually not.

-- Allow admin users to DELETE any profile
CREATE POLICY admin_delete_profiles
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles
    WHERE role_name = 'admin'
)); -- Condition: True if the logged-in user is an admin


COMMENT ON POLICY anon_read_profiles_deny ON public.profiles IS 'Deny anonymous read access to profiles.';
COMMENT ON POLICY authenticated_select_own_profiles ON public.profiles IS 'Allow authenticated users to read their own profile.';
COMMENT ON POLICY authenticated_update_own_profiles ON public.profiles IS 'Allow authenticated users to update their own profile (excluding role, which is managed via function/user_roles).';
COMMENT ON POLICY authenticated_insert_own_profiles ON public.profiles IS 'Allow authenticated users to insert their own profile via API (signup trigger bypasses this).';
COMMENT ON POLICY authenticated_delete_own_profiles ON public.profiles IS 'Allow authenticated users to delete their own profile.';
COMMENT ON POLICY admin_select_all_profiles ON public.profiles IS 'Allow admin users (defined in user_roles) to read any profile.';
COMMENT ON POLICY admin_insert_profiles ON public.profiles IS 'Allow admin users (defined in user_roles) to insert profiles.';
COMMENT ON POLICY admin_update_profiles ON public.profiles IS 'Allow admin users (defined in user_roles) to update any profile.';
COMMENT ON POLICY admin_delete_profiles ON public.profiles IS 'Allow admin users (defined in user_roles) to delete any profile.';

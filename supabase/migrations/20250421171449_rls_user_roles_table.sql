-- Migration: RLS for public.user_roles table (Using get_admin_user_ids function, Corrected Grants & SRF Syntax)

-- 1. Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- --- IMPORTANT: GRANT Table-Level Permissions BEFORE Defining Policies ---
-- Grant SELECT to authenticated users (so they can read their own roles, filtered by RLS)
GRANT SELECT ON public.user_roles TO authenticated;
-- Grant INSERT, UPDATE, DELETE to authenticated users (so admins, who are authenticated, can modify, filtered by RLS)
-- Regular authenticated users will be blocked by RLS policies for these operations.
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
-- Keep service_role grant (was likely in table creation, but can reiterate)
GRANT ALL ON public.user_roles TO service_role;
-- Ensure anon has no access (implicitly handled by lack of grants and explicit deny policies)


-- 2. Define RLS Policies

-- ### Policies for Anonymous Users (Deny Access) ###

CREATE POLICY anon_read_user_roles_deny
ON public.user_roles FOR SELECT
TO anon
USING (false); -- Deny anonymous read access

COMMENT ON POLICY anon_read_user_roles_deny ON public.user_roles IS 'Deny anonymous read access to user_roles.';


CREATE POLICY anon_insert_user_roles_deny
ON public.user_roles FOR INSERT
TO anon
WITH CHECK (false); -- Deny anonymous insert access

COMMENT ON POLICY anon_insert_user_roles_deny ON public.user_roles IS 'Deny anonymous insert access to user_roles.';


CREATE POLICY anon_update_user_roles_deny
ON public.user_roles FOR UPDATE
TO anon
USING (false) WITH CHECK (false); -- Deny anonymous update access

COMMENT ON POLICY anon_update_user_roles_deny ON public.user_roles IS 'Deny anonymous update access to user_roles.';


CREATE POLICY anon_delete_user_roles_deny
ON public.user_roles FOR DELETE
TO anon
USING (false); -- Deny anonymous delete access

COMMENT ON POLICY anon_delete_user_roles_deny ON public.user_roles IS 'Deny anonymous delete access to user_roles.';


-- ### Policies for Authenticated Users (Regular Users - See Their Own Roles) ###

-- Allow authenticated users to SELECT (read) their OWN role assignments
CREATE POLICY authenticated_select_own_user_roles
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id); -- Policy passes if the role assignment belongs to the logged-in user

COMMENT ON POLICY authenticated_select_own_user_roles ON public.user_roles IS 'Allow authenticated users to read their own role assignments.';

-- Authenticated users should NOT insert, update, or delete role assignments directly UNLESS they are admins.
-- The denies below are mostly redundant if no policies grant these beyond the 'own' select, but can add clarity.
CREATE POLICY authenticated_insert_user_roles_deny ON public.user_roles FOR INSERT TO authenticated WITH CHECK (false);
COMMENT ON POLICY authenticated_insert_user_roles_deny ON public.user_roles IS 'Deny authenticated users direct insert access to user_roles.';

CREATE POLICY authenticated_update_user_roles_deny ON public.user_roles FOR UPDATE TO authenticated USING (
    false
) WITH CHECK (false);
COMMENT ON POLICY authenticated_update_user_roles_deny ON public.user_roles IS 'Deny authenticated users direct update access to user_roles.';

CREATE POLICY authenticated_delete_user_roles_deny ON public.user_roles FOR DELETE TO authenticated USING (false);
COMMENT ON POLICY authenticated_delete_user_roles_deny ON public.user_roles IS 'Deny authenticated users direct delete access to user_roles.';


-- ### Policies for Admin Users and service_role (Manage All Role Assignments) ###
-- Admin users (defined in user_roles) and the service_role need full access.

-- Condition to check if the current user is an admin (NOW using the function)
-- Condition: (auth.uid() IN (SELECT * FROM public.get_admin_user_ids())) -- This is the target syntax

-- Allow admin users to SELECT all role assignments using the function
CREATE POLICY admin_select_all_user_roles
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() IN (SELECT * FROM public.get_admin_user_ids())); -- *** FIX: Use SELECT * FROM function() ***

COMMENT ON POLICY admin_select_all_user_roles ON public.user_roles IS 'Allow admin users (checked by get_admin_user_ids function) to read all user role assignments.';


-- Allow admin users to INSERT role assignments using the function
-- Note: The add_user_role function bypasses this RLS policy because it's SECURITY DEFINER.
-- This policy applies if an admin user tries a direct INSERT via the API.
CREATE POLICY admin_insert_user_roles
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IN (SELECT * FROM public.get_admin_user_ids())); -- *** FIX: Use SELECT * FROM function() ***

COMMENT ON POLICY admin_insert_user_roles ON public.user_roles IS 'Allow admin users (checked by get_admin_user_ids function) to insert user role assignments directly.';


-- Allow admin users to UPDATE any role assignment using the function (less common than insert/delete)
CREATE POLICY admin_update_user_roles
ON public.user_roles FOR UPDATE
TO authenticated
USING (auth.uid() IN (SELECT * FROM public.get_admin_user_ids())) -- *** FIX: Use SELECT * FROM function() ***
WITH CHECK (auth.uid() IN (SELECT * FROM public.get_admin_user_ids())); -- *** FIX: Use SELECT * FROM function() ***

COMMENT ON POLICY admin_update_user_roles ON public.user_roles IS 'Allow admin users (checked by get_admin_user_ids function) to update user role assignments directly.';


-- Allow admin users to DELETE any role assignment using the function
CREATE POLICY admin_delete_user_roles
ON public.user_roles FOR DELETE
TO authenticated
USING (auth.uid() IN (SELECT * FROM public.get_admin_user_ids())); -- *** FIX: Use SELECT * FROM function() ***

COMMENT ON POLICY admin_delete_user_roles ON public.user_roles IS 'Allow admin users (checked by get_admin_user_ids function) to delete user role assignments directly.';


-- The service_role needs full access to manage roles (e.g., for backend scripts)
-- This policy grants ALL permissions to the service_role, bypassing other policies for this role.
CREATE POLICY service_role_all_access
ON public.user_roles FOR ALL
TO service_role
USING (true) WITH CHECK (true); -- Always true for the service_role

COMMENT ON POLICY service_role_all_access ON public.user_roles IS 'Allow service_role full access to user_roles.';


-- Re-add comment for the table (optional, was in RLS creation script)
COMMENT ON TABLE public.user_roles IS 'Stores roles assigned to users. RLS uses get_admin_user_ids function to break recursion.';

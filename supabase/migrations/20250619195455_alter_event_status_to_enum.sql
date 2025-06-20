-- Migration to change event_status column to an ENUM type

-- Step 1: Define the new ENUM type
-- We'll create a temporary enum first, and then rename it
CREATE TYPE "public"."event_status_new" AS ENUM (
    'Draft',
    'Completed',
    'Cancelled',
    'Scheduled',
    'Registration Closed',
    'Registration Open'
);

-- Step 2: Disable RLS on the events table temporarily
-- This is necessary because RLS policies depend on the 'event_status' column.
ALTER TABLE "public"."events" DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL RLS Policies on the events table
-- This removes dependencies before we modify the column.
DROP POLICY IF EXISTS service_role_all_access_events ON "public"."events";
DROP POLICY IF EXISTS combined_authenticated_select_events ON "public"."events";
DROP POLICY IF EXISTS combined_authenticated_insert_events ON "public"."events";
DROP POLICY IF EXISTS combined_authenticated_update_events ON "public"."events";
DROP POLICY IF EXISTS combined_authenticated_delete_events ON "public"."events";
DROP POLICY IF EXISTS combined_anon_select_events ON "public"."events";
DROP POLICY IF EXISTS combined_anon_insert_events_deny ON "public"."events";
DROP POLICY IF EXISTS combined_anon_update_events_deny ON "public"."events";
DROP POLICY IF EXISTS combined_anon_delete_events_deny ON "public"."events";


-- Step 4: Add a new column with the ENUM type
ALTER TABLE "public"."events" ADD COLUMN "event_status_temp" "public"."event_status_new";

-- Step 5: Copy data from the old column to the new column
-- Make sure all values in the original column are valid for the new ENUM type
UPDATE "public"."events" SET "event_status_temp" = "event_status"::text::"public"."event_status_new";

-- Step 6: Drop the old column
ALTER TABLE "public"."events" DROP COLUMN "event_status";

-- Step 7: Rename the new column to the original column name
ALTER TABLE "public"."events" RENAME COLUMN "event_status_temp" TO "event_status";

-- Step 8: Add NOT NULL constraint
ALTER TABLE "public"."events" ALTER COLUMN "event_status" SET NOT NULL;


-- Step 9: Recreate ALL RLS Policies, adjusting 'event_status' references
-- Policies are recreated exactly as they were, but 'event_status' comparisons
-- are now direct to the ENUM values, *with explicit casts for array literals*.

-- service_role_all_access_events
CREATE POLICY service_role_all_access_events
ON "public"."events" AS PERMISSIVE FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- combined_authenticated_select_events
CREATE POLICY combined_authenticated_select_events
ON "public"."events" AS PERMISSIVE FOR SELECT
TO authenticated
USING (((event_status = any(
    ARRAY['Registration Open'::event_status_new, 'Scheduled'::event_status_new])) OR ((SELECT auth.uid() AS uid) IN (
    SELECT user_roles.user_id
    FROM user_roles
    WHERE (user_roles.role_name = 'admin'::text)
))));

-- combined_authenticated_insert_events
CREATE POLICY combined_authenticated_insert_events
ON "public"."events" AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (((
    SELECT auth.uid() AS uid) IN (
    SELECT user_roles.user_id
    FROM user_roles
    WHERE (user_roles.role_name = 'admin'::text)
)));

-- combined_authenticated_update_events
CREATE POLICY combined_authenticated_update_events
ON "public"."events" AS PERMISSIVE FOR UPDATE
TO authenticated
USING (((
    SELECT auth.uid() AS uid) IN (SELECT user_roles.user_id
FROM user_roles
WHERE (user_roles.role_name = 'admin'::text)))) WITH CHECK (((SELECT auth.uid() AS uid) IN (
    SELECT user_roles.user_id
    FROM user_roles
    WHERE (user_roles.role_name = 'admin'::text)
)));

-- combined_authenticated_delete_events
CREATE POLICY combined_authenticated_delete_events
ON "public"."events" AS PERMISSIVE FOR DELETE
TO authenticated
USING (((
    SELECT auth.uid() AS uid) IN (
    SELECT user_roles.user_id
    FROM user_roles
    WHERE (user_roles.role_name = 'admin'::text)
)));

-- combined_anon_select_events
CREATE POLICY combined_anon_select_events
ON "public"."events" AS PERMISSIVE FOR SELECT
TO anon
USING ((event_status = any(ARRAY['Registration Open'::event_status_new, 'Scheduled'::event_status_new])));

-- combined_anon_insert_events_deny
CREATE POLICY combined_anon_insert_events_deny
ON "public"."events" AS RESTRICTIVE FOR INSERT
TO anon
WITH CHECK (false);

-- combined_anon_update_events_deny
CREATE POLICY combined_anon_update_events_deny
ON "public"."events" AS RESTRICTIVE FOR UPDATE
TO anon
USING (false);

-- combined_anon_delete_events_deny
CREATE POLICY combined_anon_delete_events_deny
ON "public"."events" AS RESTRICTIVE FOR DELETE
TO anon
USING (false);


-- Step 10: Re-enable RLS on the events table
ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;

-- Step 11: Clean up: Rename the ENUM type
ALTER TYPE "public"."event_status_new" RENAME TO "event_status";

-- Step 12: Add a default value if desired (e.g., 'Draft')
ALTER TABLE "public"."events" ALTER COLUMN "event_status" SET DEFAULT 'Draft';

-- Migration: Drop unused get_applied_participants_count function

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_applied_participants_count(uuid);

-- Add a comment for documentation
COMMENT ON SCHEMA public IS 'Removed unused function get_applied_participants_count as part of process_status column migration cleanup.';

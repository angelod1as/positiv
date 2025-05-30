-- Migration: Add indexes to improve performance of the getAdminParticipantsByEventId query
-- This migration adds composite indexes to optimize the complex query that joins
-- event_participants, profiles, and events tables with filtering conditions

-- Add composite index for event_id and is_user_applied
-- This optimizes the WHERE conditions in the main query
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id_is_user_applied
ON public.event_participants (event_id, is_user_applied);

-- Add index for process_status
-- This helps with the condition checking if a participant was skipped in a previous event
CREATE INDEX IF NOT EXISTS idx_event_participants_process_status
ON public.event_participants (process_status);

-- Add index on time_event_start in events table
-- This optimizes the ORDER BY in the window function for ranking events
CREATE INDEX IF NOT EXISTS idx_events_time_event_start
ON public.events (time_event_start);

-- Add index for the profile_id and event_id combination
-- This optimizes the join between event_participants and the ranked_participations CTE
CREATE INDEX IF NOT EXISTS idx_event_participants_profile_id_event_id
ON public.event_participants (profile_id, event_id);

-- Comment on indexes
COMMENT ON INDEX public.idx_event_participants_event_id_is_user_applied IS 'Composite index to optimize filtering by event_id and is_user_applied';
COMMENT ON INDEX public.idx_event_participants_process_status IS 'Index to optimize filtering and checking process_status values';
COMMENT ON INDEX public.idx_events_time_event_start IS 'Index to optimize ordering by event start time in window functions';
COMMENT ON INDEX public.idx_event_participants_profile_id_event_id IS 'Composite index to optimize joins between event_participants and CTEs';

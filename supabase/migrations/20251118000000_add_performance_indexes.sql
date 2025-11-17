-- Add composite index for event_participants performance optimization
-- This index optimizes queries filtering by profile_id, event_id, and is_user_applied
-- Used in critical paths: homepage (getNextEvents), user applications (applyToEvent, cancelApplicationToEvent)

CREATE INDEX IF NOT EXISTS idx_event_participants_profile_event_applied
ON event_participants(profile_id, event_id, is_user_applied);

COMMENT ON INDEX public.idx_event_participants_profile_event_applied IS
'Optimizes queries filtering by profile, event, and application status. Used in homepage EXISTS subqueries and user application flows. Expected to reduce query time by 100-400ms on complex queries.';

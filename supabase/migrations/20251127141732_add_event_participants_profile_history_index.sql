-- POS-275: Add covering index to optimize profile's last event query
-- This index supports the correlated subquery used in getProfilesWithExtraDataById
-- to efficiently find a participant's last event status

-- Create covering index for profile event history lookups
-- Covers: profile_id, is_user_applied filtering + includes attendance_status and event_id
CREATE INDEX IF NOT EXISTS idx_event_participants_profile_history
  ON public.event_participants (profile_id, is_user_applied)
  INCLUDE (attendance_status, event_id)
  WHERE is_user_applied = true;

-- Add comment explaining the index purpose
COMMENT ON INDEX public.idx_event_participants_profile_history IS
  'Optimizes queries finding a participant''s last event status. Used in admin participant list to check if someone was skipped in their previous event.';

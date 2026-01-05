-- Remove deprecated date fields from events table
-- These fields were never used in the application:
-- - time_application_end: registration close was handled by event status, not this field
-- - time_interviews_start: interviews feature was never implemented
-- - time_interviews_end: interviews feature was never implemented

ALTER TABLE events DROP COLUMN IF EXISTS time_application_end;
ALTER TABLE events DROP COLUMN IF EXISTS time_interviews_start;
ALTER TABLE events DROP COLUMN IF EXISTS time_interviews_end;

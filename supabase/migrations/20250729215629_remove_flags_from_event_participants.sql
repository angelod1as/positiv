-- Remove flag columns from event_participants table
-- These columns have been moved to the profiles table
ALTER TABLE public.event_participants
DROP COLUMN IF EXISTS flag,
DROP COLUMN IF EXISTS flag_notes;
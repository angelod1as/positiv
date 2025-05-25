-- Migration: Add missing indexes for foreign keys
-- This migration adds indexes for foreign keys in the event_participants table
-- to improve query performance

-- Add index for event_participants_event_id_fkey
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id
ON public.event_participants (event_id);

-- Add index for event_participants_profile_id_fkey
CREATE INDEX IF NOT EXISTS idx_event_participants_profile_id
ON public.event_participants (profile_id);

-- Comment on indexes
COMMENT ON INDEX public.idx_event_participants_event_id IS 'Index for the event_id foreign key to improve join and filter performance';
COMMENT ON INDEX public.idx_event_participants_profile_id IS 'Index for the profile_id foreign key to improve join and filter performance';

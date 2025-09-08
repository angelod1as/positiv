-- Add unique constraint on event_id to ensure only one snapshot per event
-- This enables proper UPSERT operations with onConflict
ALTER TABLE public.event_demographics_history
ADD CONSTRAINT event_demographics_history_event_id_unique UNIQUE (event_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT event_demographics_history_event_id_unique ON public.event_demographics_history
IS 'Ensures only one demographics snapshot exists per event';

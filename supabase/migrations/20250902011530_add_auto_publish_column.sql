-- Add auto_publish column to events table for automatic event status transitions
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS auto_publish boolean NOT NULL DEFAULT true;

-- Add comment to document the column
COMMENT ON COLUMN public.events.auto_publish IS 'Whether the event should automatically transition from Scheduled to Registration Open when time_application_start is reached. Default is true for automatic publishing.';

-- Add index for efficient queries when checking events to auto-publish
CREATE INDEX IF NOT EXISTS idx_events_auto_publish_status 
ON public.events(event_status, auto_publish, time_application_start) 
WHERE event_status = 'Scheduled' AND auto_publish = true;
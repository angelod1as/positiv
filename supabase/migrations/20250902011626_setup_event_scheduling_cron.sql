-- Set up pg_cron job to automatically update event statuses
-- This job runs every 5 minutes to check for events that need to be published

-- First, ensure pg_cron extension is enabled (should already be from previous migrations)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove the old job if it exists (for idempotency)
DO $$
BEGIN
  -- Check if the job exists and unschedule it
  IF EXISTS (
    SELECT 1 FROM cron.job 
    WHERE jobname = 'update-event-statuses-automatically'
  ) THEN
    PERFORM cron.unschedule('update-event-statuses-automatically');
  END IF;
END $$;

-- Create the cron job to run every 5 minutes
SELECT cron.schedule(
  'update-event-statuses-automatically',  -- Job name
  '*/5 * * * *',                          -- Every 5 minutes
  $job$
    SELECT public.update_event_statuses_automatically();
  $job$
);

-- Add comment to document the cron job
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for automatic event status updates';
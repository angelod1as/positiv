-- Schedule cron job to process newsletter campaigns via API
-- Runs every 30 minutes at :05 and :35
-- Calls internal API endpoint directly (no Edge Function)

-- Enable pg_net extension for making HTTP requests (should already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old job if it exists (for idempotency)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'process-newsletter-campaigns'
  ) THEN
    PERFORM cron.unschedule('process-newsletter-campaigns');
  END IF;
END $$;

-- Only create cron job in production, not in local development
DO $do$
DECLARE
  app_url text;
  internal_secret text;
  is_local boolean;
BEGIN
  -- Check if this is local development
  app_url := current_setting('app.settings.app_url', true);
  is_local := (app_url IS NULL OR app_url = '' OR app_url LIKE '%127.0.0.1%' OR app_url LIKE '%localhost%');

  IF is_local THEN
    RAISE NOTICE 'Skipping cron job creation in local development environment';
    RETURN;
  END IF;

  -- Get app URL and internal job secret from settings
  -- These should be set via Supabase dashboard secrets
  app_url := current_setting('app.settings.app_url', false);
  internal_secret := current_setting('app.settings.internal_job_secret', false);

  -- Create the cron job to run at :05 and :35 every hour
  PERFORM cron.schedule(
    'process-newsletter-campaigns',
    '5,35 * * * *',  -- At minute 5 and 35 of every hour
    $job$
    SELECT
      net.http_post(
        url := current_setting('app.settings.app_url') || '/api/process-campaigns',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.internal_job_secret')
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: process-newsletter-campaigns';
END $do$;

-- Add comment to document the cron job
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for automatic event status updates and newsletter campaign processing';

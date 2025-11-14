-- Schedule Edge Function to process newsletter campaigns
-- Runs every 30 minutes at :05 and :35

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
  supabase_url text;
  service_role_key text;
  is_local boolean;
BEGIN
  -- Check if this is local development
  supabase_url := current_setting('app.settings.supabase_url', true);
  is_local := (supabase_url IS NULL OR supabase_url = '' OR supabase_url LIKE '%127.0.0.1%' OR supabase_url LIKE '%localhost%');

  IF is_local THEN
    RAISE NOTICE 'Skipping cron job creation in local development environment';
    RETURN;
  END IF;

  -- Get Supabase URL and service role key from settings
  -- These should be set via Supabase dashboard secrets
  supabase_url := current_setting('app.settings.supabase_url', false);
  service_role_key := current_setting('app.settings.supabase_service_role_key', false);

  -- Create the cron job to run at :05 and :35 every hour
  PERFORM cron.schedule(
    'process-newsletter-campaigns',
    '5,35 * * * *',  -- At minute 5 and 35 of every hour
    $job$
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/process-newsletter-campaigns',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: process-newsletter-campaigns';
END $do$;

-- Add comment to document the cron job
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for automatic event status updates and newsletter campaign processing';

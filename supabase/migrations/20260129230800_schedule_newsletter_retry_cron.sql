-- Part 2/2: Schedule cron job (depends on schema changes from Part 1)
-- Schedule cron job to retry failed newsletter syncs via API
-- Runs every 30 minutes
-- Calls internal API endpoint directly
-- Part of POS-262: Add cron job to retry failed newsletter syncs to Listmonk

-- Remove old job if it exists (for idempotency)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'retry-failed-newsletter-syncs'
  ) THEN
    PERFORM cron.unschedule('retry-failed-newsletter-syncs');
  END IF;
END $$;

-- Only create cron job in production/staging, not in local development
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
  app_url := current_setting('app.settings.app_url', true);
  internal_secret := current_setting('app.settings.internal_job_secret', true);

  IF app_url IS NULL OR internal_secret IS NULL THEN
    RAISE WARNING 'Cron job not created: app.settings.app_url and app.settings.internal_job_secret must be configured';
    RETURN;
  END IF;

  -- Create the cron job to run every 30 minutes
  PERFORM cron.schedule(
    'retry-failed-newsletter-syncs',
    '*/30 * * * *',  -- Every 30 minutes
    $job$
    SELECT
      net.http_post(
        url := current_setting('app.settings.app_url') || '/api/retry-newsletter-syncs',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.internal_job_secret')
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: retry-failed-newsletter-syncs';
END $do$;

-- Update comment to document the new cron job
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for event status updates, newsletter campaigns, and newsletter sync retries';

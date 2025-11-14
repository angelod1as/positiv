-- Fix newsletter campaign cron job to use Supabase Vault secrets
-- Replaces the job created in 20251113150003

-- Remove old job if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'process-newsletter-campaigns'
  ) THEN
    PERFORM cron.unschedule('process-newsletter-campaigns');
  END IF;
END $$;

-- Only create cron job in production/staging, not in local development
DO $do$
DECLARE
  app_url text;
  is_local boolean;
BEGIN
  -- Get app URL from vault (will be null in local dev)
  app_url := get_vault_secret('app_url');

  -- Check if this is local development
  is_local := (app_url IS NULL OR app_url = '' OR app_url LIKE '%127.0.0.1%' OR app_url LIKE '%localhost%');

  IF is_local THEN
    RAISE NOTICE 'Skipping cron job creation in local development environment';
    RETURN;
  END IF;

  -- Create the cron job using Vault secrets
  PERFORM cron.schedule(
    'process-newsletter-campaigns',
    '5,35 * * * *',  -- At minute 5 and 35 of every hour
    $job$
    SELECT
      net.http_post(
        url := get_vault_secret('app_url') || '/api/process-campaigns',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || get_vault_secret('internal_job_secret')
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: process-newsletter-campaigns using Vault secrets';
END $do$;

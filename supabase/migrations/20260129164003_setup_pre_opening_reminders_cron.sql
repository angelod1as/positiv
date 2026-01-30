-- Setup cron job for pre-opening reminder campaigns
-- This job processes pre-opening reminder campaigns (3-day advance notifications)
-- Runs every 30 minutes to check for events that need reminders sent

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
    'process-pre-opening-reminders',
    '*/30 * * * *',  -- Every 30 minutes
    $job$
    SELECT
      net.http_post(
        url := get_vault_secret('app_url') || '/api/process-pre-opening-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || get_vault_secret('internal_job_secret')
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: process-pre-opening-reminders using Vault secrets';
END $do$;

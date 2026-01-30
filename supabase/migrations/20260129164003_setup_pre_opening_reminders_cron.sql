-- Setup cron job for pre-opening reminder campaigns
-- This job processes pre-opening reminder campaigns (3-day advance notifications)
-- Runs every 30 minutes to check for events that need reminders sent
--
-- DEPENDS ON: 20260129164002_add_campaign_types.sql
-- This migration requires the campaign_type column and should_send_at column
-- added by the previous migration to function correctly.

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

  -- Remove existing job if it exists (idempotency)
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'process-pre-opening-reminders'
  ) THEN
    PERFORM cron.unschedule('process-pre-opening-reminders');
    RAISE NOTICE 'Removed existing cron job: process-pre-opening-reminders';
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

-- Schedules the retry of failed Listmonk syncs, which 20260129230800 meant to
-- do and never did in production.
--
-- That migration guarded on current_setting('app.settings.app_url', true),
-- which reads as null in production, so it took its local-development branch,
-- printed a notice and created nothing. The URL and the token come from the
-- vault here, like process-newsletter-campaigns, process-pre-opening-reminders
-- and retry-payment-emails.
--
-- Every 30 minutes, the schedule the sweep's backoff was written against.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-failed-newsletter-syncs') THEN
    PERFORM cron.unschedule('retry-failed-newsletter-syncs');
  END IF;
END $$;

DO $do$
DECLARE
  app_url text;
BEGIN
  app_url := get_vault_secret('app_url');

  -- Locally there is no app on a stable URL to call, and the tests drive the
  -- sweep directly.
  IF app_url IS NULL OR app_url = ''
     OR app_url LIKE '%127.0.0.1%' OR app_url LIKE '%localhost%' THEN
    RAISE NOTICE 'Skipping cron job creation in local development environment';
    RETURN;
  END IF;

  IF get_vault_secret('internal_job_secret') IS NULL THEN
    RAISE EXCEPTION 'Migration failed: the internal_job_secret vault secret must exist before running this migration.';
  END IF;

  PERFORM cron.schedule(
    'retry-failed-newsletter-syncs',
    '*/30 * * * *',
    $job$
    SELECT net.http_post(
      url := get_vault_secret('app_url') || '/api/retry-newsletter-syncs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_vault_secret('internal_job_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: retry-failed-newsletter-syncs';
END $do$;

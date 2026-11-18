-- Schedules the sync of the Registration alerts Listmonk list (WEB-52) from
-- email_consents.registration_alerts. Alerts are on by default, so every new
-- profile has to reach the list before the next opening campaign; the first
-- run after deploy fills it.
--
-- Every 30 minutes, at :15 and :45, between the runs of
-- 'sync-listmonk-unsubscribes', so a Listmonk unsubscribe reaches the site
-- before this job reads it. The URL and the token come from the vault, like
-- every other internal job.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-registration-alerts-list') THEN
    PERFORM cron.unschedule('sync-registration-alerts-list');
  END IF;
END $$;

DO $do$
DECLARE
  app_url text;
BEGIN
  app_url := get_vault_secret('app_url');

  -- Locally there is no app on a stable URL to call, and the tests drive the
  -- sync directly.
  IF app_url IS NULL OR app_url = ''
     OR app_url LIKE '%127.0.0.1%' OR app_url LIKE '%localhost%' THEN
    RAISE NOTICE 'Skipping cron job creation in local development environment';
    RETURN;
  END IF;

  IF get_vault_secret('internal_job_secret') IS NULL THEN
    RAISE EXCEPTION 'Migration failed: the internal_job_secret vault secret must exist before running this migration.';
  END IF;

  PERFORM cron.schedule(
    'sync-registration-alerts-list',
    '15,45 * * * *',
    $job$
    SELECT net.http_post(
      url := get_vault_secret('app_url') || '/api/sync-registration-alerts-list',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_vault_secret('internal_job_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: sync-registration-alerts-list';
END $do$;

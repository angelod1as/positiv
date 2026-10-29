-- Schedules the daily sync of the Veterans Listmonk list (POS-656). Completing
-- an event and changing someone's veteran flag already sync it; this catches
-- what those miss — attendance marked after the event was completed, consent
-- changes, a failed Listmonk call.
--
-- Once a day at 06:00 UTC (03:00 in Brasília). The URL and the token come from
-- the vault, like every other internal job.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-veterans-list') THEN
    PERFORM cron.unschedule('sync-veterans-list');
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
    'sync-veterans-list',
    '0 6 * * *',
    $job$
    SELECT net.http_post(
      url := get_vault_secret('app_url') || '/api/sync-veterans-list',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_vault_secret('internal_job_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: sync-veterans-list';
END $do$;

-- Schedules the pull of unsubscribes made in Listmonk back into newsletter
-- consent on the site (POS-635). Listmonk has no outgoing webhooks, so its own
-- unsubscribe link, Gmail's one-click List-Unsubscribe, the admin and bounces
-- only reach newsletter_subscriptions through this job.
--
-- Every 30 minutes, like retry-failed-newsletter-syncs. The URL and the token
-- come from the vault, like every other internal job.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-listmonk-unsubscribes') THEN
    PERFORM cron.unschedule('sync-listmonk-unsubscribes');
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
    'sync-listmonk-unsubscribes',
    '*/30 * * * *',
    $job$
    SELECT net.http_post(
      url := get_vault_secret('app_url') || '/api/sync-listmonk-unsubscribes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_vault_secret('internal_job_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: sync-listmonk-unsubscribes';
END $do$;

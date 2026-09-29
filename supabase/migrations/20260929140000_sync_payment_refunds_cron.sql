-- Reads from Asaas the payments it may still have news about: a refund asked
-- for and not complete, a refund Asaas lists as still on its way, a card whose
-- anticipation has not been credited. A refund "em progresso" is never a
-- webhook event, and a delivery lost while the endpoint was down leaves the
-- row behind; this is what catches both up.
--
-- Every fifteen minutes; the sync takes at most twenty payments a run and
-- skips one read in the last ten minutes.
--
-- The URL and the token come from the vault, like retry-payment-emails.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-payment-refunds') THEN
    PERFORM cron.unschedule('sync-payment-refunds');
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
    'sync-payment-refunds',
    '*/15 * * * *',
    $job$
    SELECT net.http_post(
      url := get_vault_secret('app_url') || '/api/sync-payment-refunds',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_vault_secret('internal_job_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: sync-payment-refunds';
END $do$;

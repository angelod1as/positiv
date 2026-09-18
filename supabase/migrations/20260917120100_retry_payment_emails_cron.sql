-- Sends the payment emails that never went out. The row is written with the
-- transition that owes it, so what is left after a failed send is state this
-- job can act on: a receipt arrives late instead of never.
--
-- Every five minutes; the sweep itself only takes a row that has been owed for
-- ten, which leaves the send that follows the webhook time to succeed on its
-- own.
--
-- The URL and the token come from the vault, like process-newsletter-campaigns
-- and process-pre-opening-reminders. The current_setting('app.settings.*')
-- shape that 20260129230800 uses reads as null in production, so the guard in
-- that migration took its local-development branch there and the job it
-- describes was never created.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-payment-emails') THEN
    PERFORM cron.unschedule('retry-payment-emails');
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
    'retry-payment-emails',
    '*/5 * * * *',
    $job$
    SELECT net.http_post(
      url := get_vault_secret('app_url') || '/api/retry-payment-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_vault_secret('internal_job_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: retry-payment-emails';
END $do$;

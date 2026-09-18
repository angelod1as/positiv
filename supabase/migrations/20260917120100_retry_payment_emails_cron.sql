-- Sends the payment emails that never went out. The row is written with the
-- transition that owes it, so what is left after a failed send is state this
-- job can act on: a receipt arrives late instead of never.
--
-- Every five minutes; the sweep itself only takes a row that has been owed for
-- ten, which leaves the send that follows the webhook time to succeed on its
-- own.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-payment-emails') THEN
    PERFORM cron.unschedule('retry-payment-emails');
  END IF;
END $$;

DO $do$
DECLARE
  app_url text;
  internal_secret text;
BEGIN
  app_url := current_setting('app.settings.app_url', true);

  -- Locally there is no app on a stable URL to call, and the tests drive the
  -- sweep directly.
  IF app_url IS NULL OR app_url = ''
     OR app_url LIKE '%127.0.0.1%' OR app_url LIKE '%localhost%' THEN
    RAISE NOTICE 'Skipping cron job creation in local development environment';
    RETURN;
  END IF;

  internal_secret := current_setting('app.settings.internal_job_secret', true);

  IF internal_secret IS NULL THEN
    RAISE EXCEPTION 'Migration failed: app.settings.internal_job_secret must be configured before running this migration.';
  END IF;

  PERFORM cron.schedule(
    'retry-payment-emails',
    '*/5 * * * *',
    $job$
    SELECT net.http_post(
      url := current_setting('app.settings.app_url') || '/api/retry-payment-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.internal_job_secret')
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );

  RAISE NOTICE 'Created cron job: retry-payment-emails';
END $do$;

-- A charge stops being payable at due_at. Asaas sends PAYMENT_OVERDUE for a
-- charge that reached it, but a row still in 'pending' has no Asaas charge yet,
-- so nothing outside would ever close it.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-payments') THEN
    PERFORM cron.unschedule('expire-payments');
  END IF;

  PERFORM cron.schedule(
    'expire-payments',
    '*/15 * * * *',
    $job$
    UPDATE public.payments
       SET status = 'expired'
     WHERE status IN ('pending', 'awaiting_payment')
       AND due_at < now();
    $job$
  );
END $do$;

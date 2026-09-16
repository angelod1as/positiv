-- The net a card plan has brought in is recomputed from the inbox on every
-- CONFIRMED/RECEIVED of the plan, keyed by the installment id inside the
-- payload. The inbox keeps every delivery for auditing, so without an index
-- over that path the lookup is a sequential scan that grows with the table --
-- inside the transaction that applies the transition.
CREATE INDEX IF NOT EXISTS payment_webhook_events_installment
  ON public.payment_webhook_events ((payload -> 'payment' ->> 'installment'))
  WHERE payload -> 'payment' ->> 'installment' IS NOT NULL;

COMMENT ON INDEX public.payment_webhook_events_installment IS
'Supports summing netValue per installment plan in payment-webhook.server.ts.';

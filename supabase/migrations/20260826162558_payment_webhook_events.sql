-- Every webhook Asaas delivers is written here before anything acts on it.
-- Asaas guarantees at-least-once delivery with a stable event id, so the unique
-- index is what makes a redelivery a no-op.
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_event_id   text NOT NULL UNIQUE,
  event_type       text NOT NULL,
  asaas_payment_id text,
  payload          jsonb NOT NULL,
  received_at      timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,
  error            text
);

CREATE INDEX IF NOT EXISTS payment_webhook_events_unprocessed
  ON public.payment_webhook_events (received_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS payment_webhook_events_asaas_payment_id
  ON public.payment_webhook_events (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

ALTER TABLE public.payment_webhook_events OWNER TO postgres;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.payment_webhook_events TO service_role;
REVOKE ALL ON TABLE public.payment_webhook_events FROM anon, authenticated;

DROP POLICY IF EXISTS service_role_all_access_payment_webhook_events
  ON public.payment_webhook_events;
CREATE POLICY service_role_all_access_payment_webhook_events
  ON public.payment_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny_payment_webhook_events ON public.payment_webhook_events;
CREATE POLICY anon_deny_payment_webhook_events ON public.payment_webhook_events
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS authenticated_deny_payment_webhook_events ON public.payment_webhook_events;
CREATE POLICY authenticated_deny_payment_webhook_events ON public.payment_webhook_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.payment_webhook_events IS
'Inbox for Asaas webhooks: dedupes redeliveries by asaas_event_id and keeps the
raw payload for auditing. processed_at is set once the transition is applied;
error records why it was not.';

-- One Asaas customer per person, reused across events so Asaas does not
-- accumulate a duplicate customer per charge.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_asaas_customer_id
  ON public.profiles (asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.asaas_customer_id IS
'Asaas customer id (cus_...), created on the first charge and reused afterwards.';

-- Payments name the provider's role, not the provider. Every Asaas call goes
-- through a connector now, and the schema follows: swapping providers must not
-- mean renaming columns.
--
-- Renames keep grants, RLS policies, indexes and constraints; only the names
-- that said "asaas" change. asaas_net goes: nothing has read it since the site
-- stopped computing fees, and the net is the provider's to report.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'payment_kind' AND e.enumlabel = 'asaas'
  ) THEN
    ALTER TYPE public.payment_kind RENAME VALUE 'asaas' TO 'online';
  END IF;
END $$;

-- The manual shape names asaas_net, so it goes before the column does and
-- comes back without it.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_manual_shape;
ALTER TABLE public.payments DROP COLUMN IF EXISTS asaas_net;

DO $$
DECLARE
  rename record;
BEGIN
  FOR rename IN
    SELECT * FROM (VALUES
      ('payments', 'asaas_customer_id', 'provider_customer_id'),
      ('payments', 'asaas_payment_id', 'provider_charge_id'),
      ('payments', 'asaas_installment_id', 'provider_plan_id'),
      ('payments', 'asaas_invoice_url', 'provider_checkout_url'),
      ('payments', 'asaas_invoice_number', 'provider_dashboard_ref'),
      ('profiles', 'asaas_customer_id', 'provider_customer_id'),
      ('payment_webhook_events', 'asaas_event_id', 'provider_event_id'),
      ('payment_webhook_events', 'asaas_payment_id', 'provider_charge_id')
    ) AS r(tbl, old_name, new_name)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = rename.tbl
         AND column_name = rename.old_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I RENAME COLUMN %I TO %I',
        rename.tbl, rename.old_name, rename.new_name
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.payments ADD CONSTRAINT payments_manual_shape
  CHECK (kind <> 'manual'
         OR (provider_charge_id IS NULL
             AND provider_plan_id IS NULL
             AND provider_checkout_url IS NULL
             AND provider_customer_id IS NULL
             AND method IS NOT NULL
             AND method IN ('pix', 'cash', 'transfer', 'other')));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.payments'::regclass
       AND conname = 'payments_asaas_shape'
  ) THEN
    ALTER TABLE public.payments
      RENAME CONSTRAINT payments_asaas_shape TO payments_online_shape;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.payment_webhook_events'::regclass
       AND conname = 'payment_webhook_events_asaas_event_id_key'
  ) THEN
    ALTER TABLE public.payment_webhook_events
      RENAME CONSTRAINT payment_webhook_events_asaas_event_id_key
      TO payment_webhook_events_provider_event_id_key;
  END IF;
END $$;

ALTER INDEX IF EXISTS public.payments_asaas_payment_id
  RENAME TO payments_provider_charge_id;
ALTER INDEX IF EXISTS public.payments_asaas_installment_id
  RENAME TO payments_provider_plan_id;
ALTER INDEX IF EXISTS public.profiles_asaas_customer_id
  RENAME TO profiles_provider_customer_id;
ALTER INDEX IF EXISTS public.payment_webhook_events_asaas_payment_id
  RENAME TO payment_webhook_events_provider_charge_id;

-- The inbox keeps the provider's raw payload for auditing, and next to it the
-- event the connector translated it into. What the domain reads -- a card
-- plan's refunds across its charges, above all -- comes from `event` and
-- provider_plan_id, never from the payload's shape.
ALTER TABLE public.payment_webhook_events
  ADD COLUMN IF NOT EXISTS provider_plan_id text,
  ADD COLUMN IF NOT EXISTS event jsonb;

CREATE INDEX IF NOT EXISTS payment_webhook_events_provider_plan_id
  ON public.payment_webhook_events (provider_plan_id)
  WHERE provider_plan_id IS NOT NULL;

-- Rows delivered before the connector existed are all Asaas's. The plan and the
-- refund events are what the domain reads back, so those are translated here
-- the way the connector does it: reais to cents, DONE is done, CANCELLED is
-- cancelled, anything else is on its way, and a PAYMENT_REFUNDED that lists
-- nothing gave the charge back whole.
UPDATE public.payment_webhook_events
   SET provider_plan_id = payload->'payment'->>'installment'
 WHERE provider_plan_id IS NULL
   AND payload->'payment'->>'installment' IS NOT NULL;

UPDATE public.payment_webhook_events w
   SET event = jsonb_build_object(
         'type',
         CASE w.event_type
           WHEN 'PAYMENT_REFUNDED' THEN 'refunded'
           ELSE 'partially_refunded'
         END,
         'refunds',
         COALESCE(
           (SELECT jsonb_agg(jsonb_build_object(
                     'amount', round(COALESCE((r->>'value')::numeric, 0) * 100)::int,
                     'state', CASE r->>'status'
                                WHEN 'DONE' THEN 'done'
                                WHEN 'CANCELLED' THEN 'cancelled'
                                ELSE 'pending'
                              END))
              FROM jsonb_array_elements(
                     CASE WHEN jsonb_typeof(w.payload->'payment'->'refunds') = 'array'
                          THEN w.payload->'payment'->'refunds'
                          ELSE '[]'::jsonb
                     END) AS r),
           CASE
             WHEN w.event_type = 'PAYMENT_REFUNDED'
                  AND w.payload->'payment'->>'value' IS NOT NULL
             THEN jsonb_build_array(jsonb_build_object(
                    'amount', round((w.payload->'payment'->>'value')::numeric * 100)::int,
                    'state', 'done'))
             ELSE 'null'::jsonb
           END
         )
       )
 WHERE w.event IS NULL
   AND w.event_type IN ('PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED');

COMMENT ON TYPE public.payment_kind IS
'online: charged through the payment provider. manual: money that arrived
outside it, recorded by an admin.';

COMMENT ON COLUMN public.payments.provider_customer_id IS
'The provider customer this charge was created against, snapshotted here so the
row stays readable on its own. profiles.provider_customer_id is the canonical
one and the source this is copied from.';

COMMENT ON COLUMN public.payments.provider_charge_id IS
'The charge at the payment provider (the first one, for a card plan billed one
charge per installment).';

COMMENT ON COLUMN public.payments.provider_plan_id IS
'The installment plan at the payment provider, when a card charge is billed as
one charge per installment. One payments row per plan.';

COMMENT ON COLUMN public.payments.provider_checkout_url IS
'The provider page where the participant pays.';

COMMENT ON COLUMN public.payments.provider_dashboard_ref IS
'What the connector needs to link the admin to the charge in the provider''s
dashboard.';

COMMENT ON COLUMN public.payments.due_at IS
'When the charge stops being payable. The expire-payments cron and the
provider''s overdue event both act on it.';

COMMENT ON COLUMN public.payments.refund_cancelled_amount IS
'Cents of refunds the provider cancelled.';

COMMENT ON COLUMN public.payments.refund_denial_reason IS
'The reason the provider gave for that denial, when it gave one.';

COMMENT ON COLUMN public.payments.refund_denied_at IS
'When the provider last denied a refund of this payment. Cleared by the next
refund request.';

COMMENT ON COLUMN public.payments.refund_pending_amount IS
'Cents the provider lists as a refund in progress, not yet given back.';

COMMENT ON COLUMN public.payments.refunds_sync_attempted_at IS
'When the refund sync last tried to read this payment from the provider,
successful or not.';

COMMENT ON COLUMN public.payments.refunds_synced_at IS
'When the refunds were last read from the provider''s API.';

COMMENT ON COLUMN public.profiles.provider_customer_id IS
'The payment provider''s customer id for this person, created on the first
charge and reused afterwards.';

COMMENT ON TABLE public.payment_webhook_events IS
'Inbox for payment provider webhooks: dedupes redeliveries by
provider_event_id, keeps the raw payload for auditing and the translated event
for the domain. processed_at is set once the transition is applied; error
records why it was not.';

COMMENT ON COLUMN public.payment_webhook_events.event_type IS
'The provider''s own name for the event, as delivered.';

COMMENT ON COLUMN public.payment_webhook_events.event IS
'The delivery translated into a payment event by the provider''s connector.';

COMMENT ON COLUMN public.app_settings.online_payments_enabled IS
'Whether participants may be charged online through the payment provider. Off
means manual payments only; the webhook and refunds keep working either way.';

COMMENT ON VIEW public.event_participant_payments IS
'Per-participant money totals in cents: what was paid and what was refunded.
The one read surface for the admin grid, the financial summary, the participant
history and the dataviz queries. Fees are the payment provider''s to report.';

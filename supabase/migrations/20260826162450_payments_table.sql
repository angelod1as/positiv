-- The payments ledger: one row per charge attempt or per payment recorded by
-- hand. This is the only place money lives; event_participants keeps none.
--
-- Every amount is an integer number of cents.

DO $$ BEGIN
  CREATE TYPE public.payment_kind AS ENUM ('asaas', 'manual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'awaiting_payment',
    'paid',
    'expired',
    'cancelled',
    'refunded',
    'partially_refunded'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'pix',
    'credit_card',
    'cash',
    'transfer',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_participant_id uuid NOT NULL
                         REFERENCES public.event_participants(id) ON DELETE RESTRICT,
  kind                 public.payment_kind NOT NULL,
  status               public.payment_status NOT NULL DEFAULT 'pending',
  base_amount          integer NOT NULL CHECK (base_amount > 0),
  amount               integer CHECK (amount > 0),
  method               public.payment_method,
  installment_count    integer CHECK (installment_count BETWEEN 1 AND 6),
  asaas_customer_id    text,
  asaas_payment_id     text,
  asaas_installment_id text,
  asaas_invoice_url    text,
  asaas_net            integer,
  due_at               timestamptz NOT NULL,
  paid_at              timestamptz,
  refund_requested_at  timestamptz,
  refunded_at          timestamptz,
  refund_amount        integer CHECK (refund_amount > 0),
  created_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note                 text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  -- paid_at exists exactly when the row is paid; amount is required once it is,
  -- but stays allowed before that — an awaiting_payment charge already knows
  -- what it will cost.
  CONSTRAINT payments_paid_shape
    CHECK ((status IN ('paid', 'refunded', 'partially_refunded'))
             = (paid_at IS NOT NULL)
           AND (status NOT IN ('paid', 'refunded', 'partially_refunded')
                OR amount IS NOT NULL)),

  -- Same shape as payments_paid_shape, for the same reason: written as one
  -- biconditional, a paid row could carry a stray refunded_at because both
  -- sides come out false. refund_amount stays allowed before the refund lands,
  -- so a requested-but-unsettled refund can record what it will return.
  CONSTRAINT payments_refund_shape
    CHECK ((status IN ('refunded', 'partially_refunded'))
             = (refunded_at IS NOT NULL)
           AND (status NOT IN ('refunded', 'partially_refunded')
                OR refund_amount IS NOT NULL)),

  CONSTRAINT payments_refund_bounded
    CHECK (refund_amount IS NULL
           OR (amount IS NOT NULL AND refund_amount <= amount)),

  -- The mirror of payments_partial_is_partial: a full refund returned the
  -- whole amount. PAYMENT_REFUNDED sets refund_amount = amount (§4), and the
  -- manual "Marcar reembolsado" picks the status from what it returns.
  CONSTRAINT payments_full_is_full
    CHECK (status <> 'refunded'
           OR (refund_amount IS NOT NULL AND refund_amount = amount)),

  CONSTRAINT payments_partial_is_partial
    CHECK (status <> 'partially_refunded'
           OR (refund_amount IS NOT NULL AND refund_amount < amount)),

  -- A manual row is only ever written after the money arrived — the admin
  -- modal and the backfill both state how — so its method is mandatory,
  -- unlike an Asaas row that has none until the participant picks one.
  CONSTRAINT payments_manual_shape
    CHECK (kind <> 'manual'
           OR (asaas_payment_id IS NULL
               AND asaas_installment_id IS NULL
               AND asaas_invoice_url IS NULL
               AND asaas_customer_id IS NULL
               AND asaas_net IS NULL
               AND method IS NOT NULL
               AND method IN ('pix', 'cash', 'transfer', 'other'))),

  -- method stays NULL until the participant picks one; from then on the
  -- payment page and the webhook handler both write it, so there is no
  -- status at which an Asaas row is expected to have lost it.
  CONSTRAINT payments_asaas_shape
    CHECK (kind <> 'asaas'
           OR method IS NULL
           OR method IN ('pix', 'credit_card')),

  CONSTRAINT payments_installments_only_on_card
    CHECK (installment_count IS NULL
           OR (method IS NOT NULL AND method = 'credit_card'))
);

-- At most one open charge per participant: "cancel the old, insert the new"
-- is then safe under concurrency — the loser of a race fails instead of
-- creating a second live charge.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_active_per_participant
  ON public.payments (event_participant_id)
  WHERE status IN ('pending', 'awaiting_payment');

CREATE UNIQUE INDEX IF NOT EXISTS payments_asaas_payment_id
  ON public.payments (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_asaas_installment_id
  ON public.payments (asaas_installment_id)
  WHERE asaas_installment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_event_participant_id
  ON public.payments (event_participant_id);

CREATE INDEX IF NOT EXISTS payments_due_active
  ON public.payments (due_at)
  WHERE status IN ('pending', 'awaiting_payment');

ALTER TABLE public.payments OWNER TO postgres;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.payments TO service_role;
REVOKE ALL ON TABLE public.payments FROM anon, authenticated;

DROP POLICY IF EXISTS service_role_all_access_payments ON public.payments;
CREATE POLICY service_role_all_access_payments ON public.payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny_payments ON public.payments;
CREATE POLICY anon_deny_payments ON public.payments
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS authenticated_deny_payments ON public.payments;
CREATE POLICY authenticated_deny_payments ON public.payments
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.payments IS
'Every charge attempt and every payment recorded by hand. Single source of truth
for what a participant paid; event_participants holds no money fields. All
amounts are integer cents.';

COMMENT ON COLUMN public.payments.base_amount IS
'What Positiv must net: the ticket price, or a custom amount set by an admin.';

COMMENT ON COLUMN public.payments.amount IS
'Gross actually charged, fees included. NULL until the participant picks an
option; for a manual payment it is what was received.';

COMMENT ON COLUMN public.payments.asaas_net IS
'netValue reported by Asaas. amount - asaas_net is the fee Asaas took, and the
audit of the pricing formula.';

COMMENT ON COLUMN public.payments.asaas_customer_id IS
'The Asaas customer this charge was created against, snapshotted here so the
row stays readable on its own. profiles.asaas_customer_id is the canonical one
and the source this is copied from.';

COMMENT ON COLUMN public.payments.due_at IS
'When the charge stops being payable. The expire-payments cron and the Asaas
PAYMENT_OVERDUE event both act on it.';

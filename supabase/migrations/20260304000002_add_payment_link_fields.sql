ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS payment_link_token TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_transaction_id UUID
    REFERENCES public.payment_transactions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_participants_payment_link_token
  ON public.event_participants (payment_link_token)
  WHERE payment_link_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_participants_payment_transaction_id
  ON public.event_participants (payment_transaction_id)
  WHERE payment_transaction_id IS NOT NULL;

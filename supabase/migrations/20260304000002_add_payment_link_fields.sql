-- Add payment link tracking fields to event_participants (POS-287)
-- These columns enable the payment link flow:
--   - payment_link_token: unique token for the payment URL
--   - payment_link_generated_at: when the link was created
--   - payment_link_expires_at: when the link expires
--   - payment_transaction_id: FK to the completed payment transaction

ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS payment_link_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_link_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_transaction_id UUID
    REFERENCES public.payment_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_participants_payment_link_token
  ON public.event_participants (payment_link_token)
  WHERE payment_link_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_participants_payment_transaction_id
  ON public.event_participants (payment_transaction_id)
  WHERE payment_transaction_id IS NOT NULL;

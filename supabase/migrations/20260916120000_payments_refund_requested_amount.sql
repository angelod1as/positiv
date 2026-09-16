-- What an admin asked Asaas to give back. A card plan is refunded one charge at
-- a time and Asaas reports each charge in its own event, so the webhook needs
-- the total the request was for to know which event completes it -- and to
-- tell the participant once, with the whole amount, rather than once per
-- charge with a fraction of it.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_requested_amount integer;

DO $$
BEGIN
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_refund_requested_amount_positive
    CHECK (refund_requested_amount IS NULL OR refund_requested_amount > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

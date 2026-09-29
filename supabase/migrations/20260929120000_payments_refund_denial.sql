-- The last refund Asaas denied, and why. A denial releases the refund claim so
-- the admin can ask again, and without these the button simply comes back
-- with nothing to say the first attempt failed. Asaas sends the reason as
-- additionalInfo.denialReason on PAYMENT_REFUND_DENIED; a new request clears
-- both.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_denied_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_denial_reason text;

COMMENT ON COLUMN public.payments.refund_denied_at IS
'When Asaas last denied a refund of this payment (PAYMENT_REFUND_DENIED). Cleared by the next refund request.';
COMMENT ON COLUMN public.payments.refund_denial_reason IS
'The reason Asaas gave for that denial (additionalInfo.denialReason), when it gave one.';

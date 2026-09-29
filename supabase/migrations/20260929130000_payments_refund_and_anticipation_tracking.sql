-- What Asaas reports about a payment's refunds and anticipation, kept on the
-- row so the admin sees it without opening Asaas. The webhook, the "Atualizar
-- do Asaas" button and the refund sync all write these from the same reading
-- of Asaas's lists.
--
-- refund_amount (existing) is what Asaas has actually given back -- refunds in
-- status DONE. These add what is still on its way and what Asaas dropped:
--   refund_pending_amount    PENDING and the AWAITING_* authorisations
--   refund_cancelled_amount  CANCELLED
-- anticipation_fee is what Asaas charges for advancing a card charge, which it
-- does not take out of the charge's netValue (asaas_net). Only anticipations
-- that were not cancelled or denied count.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_pending_amount integer,
  ADD COLUMN IF NOT EXISTS refund_cancelled_amount integer,
  ADD COLUMN IF NOT EXISTS refunds_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS anticipation_fee integer,
  ADD COLUMN IF NOT EXISTS anticipation_status text;

COMMENT ON COLUMN public.payments.refund_pending_amount IS
'Cents Asaas lists as refund in progress (PENDING, AWAITING_*), not yet given back.';
COMMENT ON COLUMN public.payments.refund_cancelled_amount IS
'Cents of refunds Asaas cancelled (CANCELLED).';
COMMENT ON COLUMN public.payments.refunds_synced_at IS
'When the refunds and anticipation were last read from Asaas''s API.';
COMMENT ON COLUMN public.payments.anticipation_fee IS
'Cents Asaas charges to anticipate this card charge or plan, outside asaas_net. Cancelled and denied anticipations excluded.';
COMMENT ON COLUMN public.payments.anticipation_status IS
'Asaas anticipation status (PENDING, SCHEDULED, CREDITED, DEBITED, CANCELLED, DENIED, OVERDUE); for a plan, the least advanced of its charges.';

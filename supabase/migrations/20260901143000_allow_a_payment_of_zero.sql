-- A payment may be zero. See
-- docs/architecture/decisions/20260901-a-payment-can-be-zero.md.
--
-- The table was shaped around an Asaas charge, where zero never happens. Two
-- kinds of participation do not fit that: a staff or social spot pays nothing
-- and is still settled, and most of the history has no amount at all -- the
-- first event with one recorded is Corpus Peladus, 2025-06-21.
--
-- Because zero was forbidden, 20260827143204_backfill_payments.sql had to put
-- something in the column and used the event's ticket price. That is the money
-- this migration takes back out: who paid and how much came in are separate
-- questions, and only an amount somebody recorded should be summed.
--
-- A zero payment still cannot be refunded, and that is left alone on purpose:
-- payments_refund_amount_check keeps refund_amount > 0, so there is no way to
-- give back money that never arrived.

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_base_amount_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_base_amount_check CHECK (base_amount >= 0);

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_amount_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_check CHECK (amount >= 0);

COMMENT ON COLUMN public.payments.amount IS
'What the participant paid, in cents. Zero is a real value: a staff or social
spot that owed nothing, or a participation settled before the amount was ever
recorded. It never means unpaid -- status says that.';

-- The rows the backfill invented an amount for are the ones whose source
-- column held no amount at all. The 496 that carried a real one keep it.
--
-- This reads event_participants.payment, so it has to run before POS-524 drops
-- that column: it is what tells an invented amount from a recorded one.
UPDATE public.payments p
   SET base_amount = 0,
       amount = 0,
       updated_at = now()
  FROM public.event_participants ep
 WHERE ep.id = p.event_participant_id
   AND p.note = 'backfill'
   AND ep.payment = 0;

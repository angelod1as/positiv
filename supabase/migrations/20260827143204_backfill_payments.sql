-- Every payment recorded before the payments ledger existed lived in two
-- columns on event_participants: a boolean and an amount in reais. All of it
-- was arranged by hand -- a PIX transfer agreed over WhatsApp, typed in by an
-- admin -- so every row here is a manual PIX payment.
--
-- A row with an amount but no tick is still a payment: the money is the fact,
-- the checkbox is bookkeeping. due_at repeats paid_at because the table
-- requires a due date and the history has none; a date in the past cannot make
-- a paid row look open, since only pending and awaiting_payment rows expire.
--
-- Idempotent: a participant that already has a payment is skipped, so applying
-- this twice cannot double anyone's history.
INSERT INTO public.payments (
  event_participant_id,
  kind,
  status,
  method,
  base_amount,
  amount,
  paid_at,
  due_at,
  note,
  created_at,
  updated_at
)
SELECT
  ep.id,
  'manual',
  'paid',
  'pix',
  -- What Positiv meant to receive: the event's price when it has one, else
  -- whatever arrived.
  GREATEST(
    COALESCE(NULLIF(e.ticket_price, 0), ROUND(ep.payment * 100)::int, 1),
    1
  ),
  -- What actually arrived. A row marked paid with no amount is credited with
  -- the ticket price, because that is what was agreed; a price of zero on both
  -- sides still has to satisfy amount > 0, hence the floor of one cent.
  GREATEST(
    COALESCE(NULLIF(ROUND(ep.payment * 100)::int, 0), NULLIF(e.ticket_price, 0), 1),
    1
  ),
  ep.updated_at,
  ep.updated_at,
  'backfill',
  ep.updated_at,
  ep.updated_at
FROM public.event_participants ep
JOIN public.events e ON e.id = ep.event_id
WHERE (ep.has_paid = true OR ep.payment > 0)
  AND NOT EXISTS (
    SELECT 1 FROM public.payments p WHERE p.event_participant_id = ep.id
  );

-- supabase/seeds/10_payments.sql

-- The payments ledger for every participant seeded above.
--
-- Until POS-523 this file derived each row from event_participants.has_paid and
-- .payment, mirroring 20260827143204_backfill_payments.sql. Nothing reads those
-- columns any more and the seeds no longer write them, so the rule stands on
-- its own: a participation that finalised was paid for, unless the person
-- withdrew or was sent to the rodizio. That keeps the live events seeded with
-- money too -- their participants have not attended anything yet, so a rule
-- resting on attendance alone would leave the admin grid empty exactly where
-- an admin looks. Everything before the ledger existed was a PIX transfer
-- arranged by hand, which is what this produces. A staff or social spot pays
-- nothing and is settled all the same, so it gets a payment of zero -- see
-- docs/architecture/decisions/20260901-a-payment-can-be-zero.md.
--
-- Participants come from more than one seed file, hence a single pass at the
-- end rather than a statement in each. 04_event_participants.sql adds the two
-- payments this rule cannot reach, and truncates event_participants with
-- CASCADE, so the rows created here are cleared with it.
INSERT INTO public.payments (
    event_participant_id, kind, status, method,
    base_amount, amount, paid_at, due_at, note, created_at, updated_at
)
SELECT
    ep.id,
    'manual',
    'paid',
    'pix',
    CASE WHEN ep.spot_type IN ('staff', 'social') THEN 0
         ELSE COALESCE(NULLIF(e.ticket_price, 0), 20000) END,
    CASE WHEN ep.spot_type IN ('staff', 'social') THEN 0
         ELSE COALESCE(NULLIF(e.ticket_price, 0), 20000) END,
    ep.updated_at,
    ep.updated_at,
    'seed',
    ep.updated_at,
    ep.updated_at
FROM public.event_participants ep
JOIN public.events e ON e.id = ep.event_id
WHERE ep.application_status = 'finalised'
  AND ep.attendance_status IN ('attended', 'not-attended', 'pending')
  AND NOT EXISTS (
      SELECT 1 FROM public.payments p WHERE p.event_participant_id = ep.id
  );

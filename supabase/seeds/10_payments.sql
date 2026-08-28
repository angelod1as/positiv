-- supabase/seeds/10_payments.sql

-- The payments ledger for every participant seeded above.
--
-- Seeds run after migrations, so 20260827143204_backfill_payments.sql cannot
-- reach them, and participants are created by more than one seed file -- hence
-- a single pass at the end rather than a statement in each. The mapping is that
-- migration's, copied: the money the seeds record in has_paid and a reais
-- amount becomes a manual PIX payment in cents, which is where the application
-- reads it from. Change the mapping there and it has to change here too --
-- nothing enforces it, because a migration is frozen once applied and a seed
-- never is.
--
-- 04_event_participants.sql truncates event_participants with CASCADE, so the
-- rows this creates are cleared with it.
INSERT INTO public.payments (
    event_participant_id, kind, status, method,
    base_amount, amount, paid_at, due_at, note, created_at, updated_at
)
SELECT
    ep.id,
    'manual',
    'paid',
    'pix',
    GREATEST(COALESCE(NULLIF(e.ticket_price, 0), ROUND(ep.payment * 100)::int, 1), 1),
    GREATEST(COALESCE(NULLIF(ROUND(ep.payment * 100)::int, 0), NULLIF(e.ticket_price, 0), 1), 1),
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

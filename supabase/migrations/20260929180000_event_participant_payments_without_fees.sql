-- The site stops computing fees: Asaas is the source of truth for money, and
-- the site records what the participant paid and what was refunded. The fee
-- column goes, and net becomes what was paid less what was refunded, whatever
-- Asaas reported as its net.
--
-- CREATE OR REPLACE cannot drop a column, so the view is dropped and created
-- again. That loses its grants and its security_invoker setting, which are
-- given back below. Nothing else depends on it.
--
-- gross:    what the participant paid
-- net:      what the participant paid, refunds already deducted

DROP VIEW IF EXISTS public.event_participant_payments;

CREATE VIEW public.event_participant_payments AS
SELECT
  ep.id AS event_participant_id,

  COALESCE(SUM(p.amount) FILTER (
    WHERE p.status IN ('paid', 'refunded', 'partially_refunded')
  ), 0)::int AS paid_gross,

  COALESCE(SUM(p.refund_amount) FILTER (
    WHERE p.status IN ('refunded', 'partially_refunded')
  ), 0)::int AS refunded,

  COALESCE(SUM(
    p.amount - COALESCE(p.refund_amount, 0)
  ) FILTER (
    WHERE p.status IN ('paid', 'refunded', 'partially_refunded')
  ), 0)::int AS net,

  COALESCE(BOOL_OR(p.status IN ('paid', 'partially_refunded')), false) AS has_paid,

  (
    SELECT a.status
      FROM public.payments a
     WHERE a.event_participant_id = ep.id
     ORDER BY (a.status IN ('pending', 'awaiting_payment')) DESC, a.created_at DESC
     LIMIT 1
  ) AS current_status,

  (
    SELECT a.id
      FROM public.payments a
     WHERE a.event_participant_id = ep.id
       AND a.status IN ('pending', 'awaiting_payment')
     LIMIT 1
  ) AS active_payment_id

FROM public.event_participants ep
LEFT JOIN public.payments p ON p.event_participant_id = ep.id
GROUP BY ep.id;

ALTER VIEW public.event_participant_payments SET (security_invoker = true);

GRANT SELECT ON public.event_participant_payments TO service_role;
REVOKE ALL ON public.event_participant_payments FROM anon, authenticated;

COMMENT ON COLUMN public.event_participant_payments.has_paid IS
'Whether Positiv currently holds this participant''s money — not whether they
ever paid. A fully refunded participant reports false; a partially refunded one
still reports true.';

COMMENT ON VIEW public.event_participant_payments IS
'Per-participant money totals in cents: what was paid and what was refunded.
The one read surface for the admin grid, the financial summary, the participant
history and the dataviz queries. Fees are Asaas''s to report.';

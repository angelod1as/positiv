-- What every reader asks about a participant's money. Built as a view so the
-- grid, the financial summary, the history and the dataviz queries all agree by
-- construction instead of by convention.
--
-- gross:    what the participant was charged, fees included
-- fee:      what Asaas kept (zero for a manual payment)
-- net:      what Positiv kept, refunds already deducted
CREATE OR REPLACE VIEW public.event_participant_payments AS
SELECT
  ep.id AS event_participant_id,

  COALESCE(SUM(p.amount) FILTER (
    WHERE p.status IN ('paid', 'refunded', 'partially_refunded')
  ), 0)::int AS paid_gross,

  COALESCE(SUM(p.refund_amount) FILTER (
    WHERE p.status IN ('refunded', 'partially_refunded')
  ), 0)::int AS refunded,

  COALESCE(SUM(p.amount - COALESCE(p.asaas_net, p.amount)) FILTER (
    WHERE p.status IN ('paid', 'refunded', 'partially_refunded')
  ), 0)::int AS fee,

  COALESCE(SUM(
    COALESCE(p.asaas_net, p.amount) - COALESCE(p.refund_amount, 0)
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

COMMENT ON VIEW public.event_participant_payments IS
'Per-participant money totals in cents. The one read surface for the admin grid,
the financial summary, the participant history and the dataviz queries.';

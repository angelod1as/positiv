-- The card plan's inbox lookups read provider_plan_id now, indexed by
-- payment_webhook_events_provider_plan_id. This index was over a path inside
-- Asaas's own payload, built for the net sum that went with asaas_net, and
-- nothing queries that path any more: it only slows every webhook insert.
DROP INDEX IF EXISTS public.payment_webhook_events_installment;

-- Prices are flat now and Positiv absorbs every fee: the site no longer
-- prices from the Asaas fee table, nor follows what anticipating a card
-- costs. Asaas is the source of truth for both. Production never had an
-- Asaas payment, so nothing written here is lost.

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_fee_snapshot_is_asaas;

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS fee_snapshot,
  DROP COLUMN IF EXISTS anticipation_fee,
  DROP COLUMN IF EXISTS anticipation_status;

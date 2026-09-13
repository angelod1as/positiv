-- The fee table a charge was priced from, written at the one moment the price
-- becomes binding: the participant picks an option and `pickOption` creates the
-- Asaas charge.
--
-- The rates behind `amount` are fetched from Asaas and cached for twelve hours,
-- and they move — a negotiated discount starts or lapses, anticipation is
-- renegotiated. Without the snapshot there is no way to explain, months later,
-- why a row cost what it cost, and no way to tell a recalibration of the
-- anticipation arithmetic from a rate change at Asaas.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS fee_snapshot jsonb;

-- A manual payment carries no Asaas fees, so it has nothing to snapshot. The
-- other Asaas-only columns say so through payments_manual_shape; that
-- constraint has already been applied everywhere and so is left alone.
DO $$
BEGIN
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_fee_snapshot_is_asaas
    CHECK (fee_snapshot IS NULL OR kind = 'asaas');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON COLUMN public.payments.fee_snapshot IS
'The Asaas fee table this charge was priced from, as the pricing engine read it
— rates as fractions, money in integer cents. Written once, by pickOption, and
never updated: it records what was true when the participant was quoted, not
what Asaas charges today.';

-- The credit card switch. Online payments on and card off means Pix only, at
-- the full event price; card on adds card in 1x to 6x at the event price and
-- takes 10% off Pix. Starts off: production opens with Pix only. The local
-- seed turns it on.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS card_payments_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.app_settings.card_payments_enabled IS
'Whether participants may pay by credit card. Only matters while online
payments are on. Off means Pix only, at the full event price.';

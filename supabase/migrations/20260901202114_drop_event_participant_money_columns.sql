-- The payments ledger has been the only description of what a participant paid
-- since POS-523; these two columns are the last copy of the same facts. The
-- index on has_paid goes with them.
--
-- What they held was moved by 20260827143204_backfill_payments.sql. To read the
-- old values after this point, restore a backup taken before it -- nothing in
-- the running database keeps them.
DROP INDEX IF EXISTS public.idx_event_participants_has_paid;

ALTER TABLE public.event_participants
  DROP COLUMN IF EXISTS has_paid,
  DROP COLUMN IF EXISTS payment;

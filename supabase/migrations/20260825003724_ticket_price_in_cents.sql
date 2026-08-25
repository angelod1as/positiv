-- events.ticket_price moves from reais with two decimals to an integer number
-- of cents, so that every money value in the schema is the same unit and no
-- arithmetic has to round.
--
-- Idempotent on the column type: a database that already holds an integer
-- column is left alone rather than multiplied a second time.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'events'
       AND column_name = 'ticket_price'
       AND data_type = 'numeric'
  ) THEN
    ALTER TABLE public.events
      ALTER COLUMN ticket_price TYPE integer
      USING ROUND(ticket_price * 100)::integer;
  END IF;
END $$;

COMMENT ON COLUMN public.events.ticket_price IS
  'Ticket price in cents. What Positiv nets; the participant pays this plus the payment fees.';

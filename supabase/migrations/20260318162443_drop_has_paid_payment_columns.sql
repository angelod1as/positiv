-- Drop deprecated has_paid and payment columns from event_participants.
-- All payment data now lives in the payment_requests table.

-- Drop the index on has_paid first
DROP INDEX IF EXISTS public.idx_event_participants_has_paid;

ALTER TABLE "public"."event_participants"
  DROP COLUMN "has_paid",
  DROP COLUMN "payment";

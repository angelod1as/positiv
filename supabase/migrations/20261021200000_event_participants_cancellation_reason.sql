-- Why a participant cancelled, typed in the cancel dialog. Optional, cleared
-- when the participant applies again. Covered by the table-level grants and
-- RLS policies event_participants already has.

ALTER TABLE public.event_participants
  ADD COLUMN IF NOT EXISTS cancellation_reason text
  CHECK (char_length(cancellation_reason) <= 500);

COMMENT ON COLUMN public.event_participants.cancellation_reason IS
'Optional reason the participant gave when cancelling, up to 500 characters.
Cleared on re-application.';

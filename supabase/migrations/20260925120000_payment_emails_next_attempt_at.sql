-- A failed send used to be retried on every sweep, every five minutes, for as
-- long as it kept failing. The row now carries when it may be tried again, and
-- the wait doubles with each attempt, so a send that will eventually go through
-- is not hammered on its way there.

ALTER TABLE public.payment_emails
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;

COMMENT ON COLUMN public.payment_emails.next_attempt_at IS
'The earliest the sweep may try this row again, set when a send fails. NULL
means any time.';

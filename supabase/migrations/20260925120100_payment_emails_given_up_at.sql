-- A send that keeps failing -- a dead mailbox, a template that throws, a
-- profile with no email -- will not start succeeding on its own. After a fixed
-- number of attempts the sweep stops claiming the row and leaves it for a
-- person, the way the webhook inbox leaves a row with error set.

ALTER TABLE public.payment_emails
  ADD COLUMN IF NOT EXISTS given_up_at timestamptz;

-- The rows that need a person: owed, and no longer being tried.
CREATE INDEX IF NOT EXISTS payment_emails_given_up
  ON public.payment_emails (given_up_at)
  WHERE given_up_at IS NOT NULL AND sent_at IS NULL;

COMMENT ON COLUMN public.payment_emails.given_up_at IS
'When the sweep stopped trying this row because it had failed too many times.
A row with given_up_at set and sent_at null is an email still owed that needs a
person; last_error says why it did not go out.';

COMMENT ON COLUMN public.payment_emails.last_error IS
'Why the last attempt did not send. Kept for the row that keeps failing, and
what says what to fix once the sweep has given up on it.';

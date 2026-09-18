-- The outbox for the three emails a payment owes. An email is an external
-- effect and cannot take part in a commit, so what commits is the intent: the
-- row is written inside the same transaction as the state change that owes the
-- email, and the send that follows only stamps it. A send that never happened
-- is then a row the sweep can find, rather than a log line somebody has to
-- notice.

DO $$ BEGIN
  CREATE TYPE public.payment_email_kind AS ENUM (
    'link',
    'confirmation',
    'refund'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.payment_emails (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  kind       public.payment_email_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  sent_at    timestamptz,
  attempts   integer NOT NULL DEFAULT 0,
  last_error text
);

-- What the sweep reads, mirroring payment_webhook_events_unprocessed: the rows
-- that still owe a send, oldest first.
CREATE INDEX IF NOT EXISTS payment_emails_unsent
  ON public.payment_emails (created_at)
  WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS payment_emails_payment_id
  ON public.payment_emails (payment_id);

ALTER TABLE public.payment_emails OWNER TO postgres;
ALTER TABLE public.payment_emails ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.payment_emails TO service_role;
REVOKE ALL ON TABLE public.payment_emails FROM anon, authenticated;

DROP POLICY IF EXISTS service_role_all_access_payment_emails ON public.payment_emails;
CREATE POLICY service_role_all_access_payment_emails ON public.payment_emails
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny_payment_emails ON public.payment_emails;
CREATE POLICY anon_deny_payment_emails ON public.payment_emails
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS authenticated_deny_payment_emails ON public.payment_emails;
CREATE POLICY authenticated_deny_payment_emails ON public.payment_emails
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.payment_emails IS
'Outbox for payment emails. One row per email a payment owes, written in the
transaction that owes it; the send stamps sent_at afterwards. A row with
sent_at still null is an email that has to go out, and the retry-payment-emails
cron is what makes it late rather than never.';

COMMENT ON COLUMN public.payment_emails.claimed_at IS
'When a sender last took this row. The claim is a lease, not a send: it is what
stops two sweeps from delivering the same email, and it expires so a sender
that died mid-flight does not hold the row forever.';

COMMENT ON COLUMN public.payment_emails.sent_at IS
'When the email actually left. NULL means still owed.';

COMMENT ON COLUMN public.payment_emails.last_error IS
'Why the last attempt did not send. Kept for the row that keeps failing — the
sweep retries regardless, and this is what says what to fix.';

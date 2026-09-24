-- At most one owed link per payment. An admin who hit resend twice while sends
-- were failing used to leave two unsent link rows, and the sweep later
-- delivered both. The link is the same either way, so a second owed row is
-- only a second email nobody asked for. The index stops it whoever the caller
-- is; queuePaymentEmail reuses the owed row instead of tripping over it.
--
-- Links only: a payment can owe two refund emails, one from the admin's
-- refund and one from the webhook that completes it.

CREATE UNIQUE INDEX IF NOT EXISTS payment_emails_one_owed_link
  ON public.payment_emails (payment_id)
  WHERE kind = 'link' AND sent_at IS NULL;

-- WEB-47: a participant can no longer write their own registration or
-- newsletter subscription through the Data API.
--
-- The policies let authenticated insert, update and delete their own rows in
-- event_participants, and update their own newsletter_subscriptions row, with a
-- grant on every column. Holding their session and the anon key, a participant
-- could mark themselves attended (and so a veteran), staff (outside the
-- registration limit) or paid, register for a Draft or closed event, delete
-- their registration, or rewrite the sync state of their subscription.
--
-- The server writes both tables through Kysely as the owner, and the e2e
-- helpers as service_role; neither is affected. Reads stay as they were.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.event_participants, public.newsletter_subscriptions
  FROM anon, authenticated;

-- Without the grant these policies can never apply.
DROP POLICY IF EXISTS combined_authenticated_insert_event_participants ON public.event_participants;
DROP POLICY IF EXISTS combined_authenticated_update_event_participants ON public.event_participants;
DROP POLICY IF EXISTS combined_authenticated_delete_event_participants ON public.event_participants;
DROP POLICY IF EXISTS "Admins can insert newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can update newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can delete newsletter subscriptions" ON public.newsletter_subscriptions;

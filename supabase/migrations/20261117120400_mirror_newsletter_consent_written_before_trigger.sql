-- WEB-51: a subscription written after the profiles trigger (20261117120100)
-- but before the mirror (20261117120200) left its profile's row on the
-- defaults. Carry the Newsletter answer into every row still never asked, as
-- the mirror would have.
UPDATE public.email_consents ec
   SET newsletter = ns.consent_given,
       newsletter_at = CASE ns.consent_given
         WHEN true THEN coalesce(ns.last_consent_given_at, ns.subscribed_at, ns.updated_at)
         ELSE coalesce(ns.unsubscribed_at, ns.updated_at)
       END
  FROM public.newsletter_subscriptions ns
 WHERE ns.profile_id = ec.profile_id
   AND ec.newsletter_at IS NULL;

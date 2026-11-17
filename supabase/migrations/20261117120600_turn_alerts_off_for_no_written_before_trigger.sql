-- WEB-51: a no written to newsletter_subscriptions between the mirror
-- (20261117120200) and the version that also turns Registration alerts off
-- (20261117120500) reached Newsletter only. Turn alerts off for those rows,
-- dated like the no. Rows whose alerts were ever chosen are left alone.
UPDATE public.email_consents ec
   SET registration_alerts = false,
       registration_alerts_at = ec.newsletter_at
  FROM public.newsletter_subscriptions ns
 WHERE ns.profile_id = ec.profile_id
   AND ns.consent_given = false
   AND ec.newsletter = false
   AND ec.registration_alerts
   AND ec.registration_alerts_at IS NULL;

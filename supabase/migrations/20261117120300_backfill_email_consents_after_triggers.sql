-- WEB-51: db push applies each migration in its own transaction while the
-- previous app keeps serving, so a profile created between the backfill in
-- 20261117120000 and the profiles trigger in 20261117120100 has no
-- email_consents row. With both triggers in place, the same backfill runs
-- once more; rows that exist are left alone.
INSERT INTO public.email_consents (
  profile_id,
  registration_alerts,
  registration_alerts_at,
  newsletter,
  newsletter_at,
  marketing,
  marketing_at
)
SELECT
  p.id,
  coalesce(ns.consent_given, true),
  CASE WHEN ns.consent_given = false
    THEN coalesce(ns.unsubscribed_at, ns.updated_at)
  END,
  coalesce(ns.consent_given, false),
  CASE ns.consent_given
    WHEN true THEN coalesce(ns.last_consent_given_at, ns.subscribed_at, ns.updated_at)
    WHEN false THEN coalesce(ns.unsubscribed_at, ns.updated_at)
  END,
  coalesce(ns.consent_given, false),
  CASE ns.consent_given
    WHEN true THEN coalesce(ns.last_consent_given_at, ns.subscribed_at, ns.updated_at)
    WHEN false THEN coalesce(ns.unsubscribed_at, ns.updated_at)
  END
FROM public.profiles p
LEFT JOIN public.newsletter_subscriptions ns ON ns.profile_id = p.id
ON CONFLICT (profile_id) DO NOTHING;

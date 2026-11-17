-- WEB-51: consent per email category, recorded by the site; Listmonk mirrors it.
-- Each category keeps an explicit yes or no and when it was chosen: a null
-- date means the person was never asked. Reached only through Kysely, so the
-- API roles get no grants and RLS has no policies.

CREATE TABLE IF NOT EXISTS public.email_consents (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_alerts boolean NOT NULL DEFAULT true,
  registration_alerts_at timestamptz,
  newsletter boolean NOT NULL DEFAULT false,
  newsletter_at timestamptz,
  marketing boolean NOT NULL DEFAULT false,
  marketing_at timestamptz,
  access_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_consents ENABLE ROW LEVEL SECURITY;

-- Carry the consent there is over. A yes or no in newsletter_subscriptions
-- becomes the Newsletter and Marketing answer; a withdrawal also turns
-- Registration alerts off. A profile with no record keeps the defaults and no
-- dates: alerts on, the rest off, never asked.
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

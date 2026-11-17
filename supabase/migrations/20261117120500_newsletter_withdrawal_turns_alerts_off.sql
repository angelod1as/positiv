-- WEB-51: until WEB-53 ships the email preferences page, the only way out is
-- the unsubscribe link, which promises to leave everything. The backfill
-- turned Registration alerts off for everyone who had withdrawn; a no written
-- after it does the same, dated, so someone who unsubscribes tomorrow is
-- treated like someone who unsubscribed yesterday. A yes leaves alerts as
-- they are, and alerts already off keep the date they were turned off.
-- CREATE OR REPLACE keeps the EXECUTE revokes from 20261117120200.

CREATE OR REPLACE FUNCTION public.mirror_newsletter_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.email_consents AS ec (profile_id, newsletter, newsletter_at)
  VALUES (NEW.profile_id, NEW.consent_given, now())
  ON CONFLICT (profile_id) DO UPDATE
    SET newsletter = EXCLUDED.newsletter,
        newsletter_at = EXCLUDED.newsletter_at
    WHERE ec.newsletter IS DISTINCT FROM EXCLUDED.newsletter
       OR ec.newsletter_at IS NULL;

  IF NEW.consent_given = false THEN
    UPDATE public.email_consents
       SET registration_alerts = false,
           registration_alerts_at = now()
     WHERE profile_id = NEW.profile_id
       AND (registration_alerts OR registration_alerts_at IS NULL);
  END IF;

  RETURN NEW;
END;
$$;

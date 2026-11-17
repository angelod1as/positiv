-- WEB-51: until WEB-54 changes the signup, the site still writes Newsletter
-- consent to newsletter_subscriptions.consent_given, from several places
-- (signup, unsubscribe page, Listmonk unsubscribe sync, retries). A trigger
-- carries every change into email_consents.newsletter, dated when the answer
-- changes or is given for the first time; writing the same answer again keeps
-- the original date. Registration alerts and Marketing are separate choices
-- and are not touched. SECURITY DEFINER for the same reason as
-- create_email_consents_for_profile: the e2e helpers write subscriptions as
-- service_role.

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
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mirror_newsletter_consent()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE TRIGGER mirror_newsletter_consent
  AFTER INSERT OR UPDATE OF consent_given ON public.newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_newsletter_consent();

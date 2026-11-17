-- WEB-51: every profile has its email_consents row from the moment it exists,
-- with the defaults: Registration alerts on, Newsletter and Marketing off,
-- never asked. SECURITY DEFINER because the e2e helpers insert profiles as
-- service_role, which has no grant on email_consents; a trigger fires without
-- EXECUTE, so nobody gets to call it directly.

CREATE OR REPLACE FUNCTION public.create_email_consents_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.email_consents (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_email_consents_for_profile()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE TRIGGER create_email_consents_for_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_email_consents_for_profile();

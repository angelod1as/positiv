-- WEB-53: the "Seus e-mails" page lets each category be chosen on its own, so
-- a no on the Newsletter stops turning Registration alerts off. A block in
-- Listmonk still turns everything off, through the unsubscribe sync.
--
-- confirmed_at records when the person last saved their choices on the page,
-- changed or not: seeing the options and saving is confirming them. Empty for
-- everyone until they do. Reached only through Kysely, like the rest of the
-- table, so no grant.

ALTER TABLE public.email_consents
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

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
  RETURN NEW;
END;
$$;

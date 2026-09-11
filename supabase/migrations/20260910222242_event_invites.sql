-- An invite lets one named person past a closed event's gate, without the
-- event reopening for anyone else.
--
-- The token is a pointer, not a secret: it names an (event, profile) pair, and
-- authorization is the row read against the signed-in profile. A link
-- forwarded to somebody else is inert, and the invite survives a device change
-- because nothing about it lives in a cookie.
CREATE TABLE IF NOT EXISTS public.event_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at    timestamptz,
  revoked_at timestamptz,
  UNIQUE (event_id, profile_id)
);

CREATE INDEX IF NOT EXISTS event_invites_event_id
  ON public.event_invites (event_id);

ALTER TABLE public.event_invites OWNER TO postgres;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.event_invites TO service_role;
REVOKE ALL ON TABLE public.event_invites FROM anon, authenticated;

DROP POLICY IF EXISTS service_role_all_access_event_invites ON public.event_invites;
CREATE POLICY service_role_all_access_event_invites ON public.event_invites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny_event_invites ON public.event_invites;
CREATE POLICY anon_deny_event_invites ON public.event_invites
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS authenticated_deny_event_invites ON public.event_invites;
CREATE POLICY authenticated_deny_event_invites ON public.event_invites
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.event_invites IS
'One invite per (event, profile). Valid while revoked_at is null, whatever
used_at says -- somebody who cancels and changes their mind uses the same link
again. used_at is stamped when the application is submitted, not when the link
is opened: opening is not using.';

-- The admin's search matches names as they are typed, without accents.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

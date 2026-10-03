-- Signup guard: a per-IP attempt counter and a list of e-mail domains that may
-- not sign up. Both are read and written only by the server through Kysely,
-- which connects as postgres, so neither gets a grant or a policy: RLS on and
-- nothing granted keeps them out of PostgREST entirely.

-- One row per signup attempt that reached the limiter. The address is stored
-- as its sha256, never in the clear, and rows older than the window are
-- deleted as new ones arrive.
CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signup_attempts_ip_hash_created_at_idx
  ON public.signup_attempts (ip_hash, created_at);

CREATE INDEX IF NOT EXISTS signup_attempts_created_at_idx
  ON public.signup_attempts (created_at);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

-- Domains a bot signed up with and no confirmed Positiv user has (POS-598).
-- Edited with SQL or Supabase Studio; no deploy needed.
CREATE TABLE IF NOT EXISTS public.blocked_signup_domains (
  domain     text PRIMARY KEY CHECK (domain = lower(btrim(domain)) AND domain <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_signup_domains ENABLE ROW LEVEL SECURITY;

INSERT INTO public.blocked_signup_domains (domain) VALUES
  ('aol.com'),
  ('att.net'),
  ('comcast.net'),
  ('cox.net'),
  ('frontier.com'),
  ('hotmail.co.uk'),
  ('mac.com'),
  ('msn.com'),
  ('rogers.com'),
  ('sbcglobal.net'),
  ('shaw.ca'),
  ('verizon.net'),
  ('yahoo.co.uk'),
  ('yahoo.com'),
  ('ymail.com')
ON CONFLICT (domain) DO NOTHING;

-- Attempt counter for sign-in and password reset (POS-517), the same shape as
-- signup_attempts. Read and written only by the server through Kysely, which
-- connects as postgres, so it gets no grant and no policy: RLS on and nothing
-- granted keeps it out of PostgREST entirely.

-- One row per counted attempt. The key — a client IP or an e-mail address — is
-- stored as its sha256, never in the clear, and rows older than the longest
-- window are deleted as new ones arrive.
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope      text NOT NULL CHECK (scope IN ('login_ip', 'login_email', 'reset_ip', 'reset_email')),
  key_hash   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_attempts_scope_key_hash_created_at_idx
  ON public.auth_attempts (scope, key_hash, created_at);

CREATE INDEX IF NOT EXISTS auth_attempts_created_at_idx
  ON public.auth_attempts (created_at);

ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

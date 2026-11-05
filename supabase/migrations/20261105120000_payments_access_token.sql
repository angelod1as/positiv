-- WEB-9: a per-payment link that opens the payment page without login.
--
-- 192 bits from pgcrypto's CSPRNG, as a database default so every creation
-- path gets one. The default is volatile, so ADD COLUMN gives every existing
-- row its own token: no backfill.
--
-- Stored as-is, not hashed: the admin copies the link, so the value has to be
-- readable, and the worst a leaked link does is let someone pay another
-- person's bill. payments is already closed to anon and authenticated
-- (20260826162450_payments_table.sql), so the column needs no grant.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS access_token text NOT NULL
    DEFAULT encode(extensions.gen_random_bytes(24), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS payments_access_token_key
  ON public.payments (access_token);

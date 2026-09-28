-- Settings an admin changes from the admin, with no deploy. One row, ever: the
-- primary key can only be true. The first setting is the online payments
-- switch, which takes payments back to manual-only at any moment.
--
-- Read only through Kysely, which connects as the owner, so no role gets a
-- grant. RLS is on with no policy, so anon and authenticated see nothing even
-- if a grant ever appears.

CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  online_payments_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.app_settings IS
'Admin-controlled settings. A single row, keyed by id = true.';

COMMENT ON COLUMN public.app_settings.online_payments_enabled IS
'Whether participants may be charged online through Asaas. Off means manual
payments only; the webhook and refunds keep working either way.';

-- WEB-69: only admins handle payments.

INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'payments.manage')
ON CONFLICT DO NOTHING;

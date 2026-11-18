-- WEB-56: only admins add participants directly.

INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'participants.add_directly')
ON CONFLICT DO NOTHING;

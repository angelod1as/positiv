-- POS-623: staff and admins apply to events as staff spots.
--
-- Admin is staff plus, so both roles hold it.

INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'events.apply_as_staff'),
  ('staff', 'events.apply_as_staff')
ON CONFLICT DO NOTHING;

-- POS-628: the permission that marks who receives admin notifications.
--
-- On its own because a value added to an enum cannot be used in the
-- transaction that adds it; the next migration grants it and reads it.

ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'notifications.receive_admin';

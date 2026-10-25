-- POS-623: the permission that makes an application a staff spot.
--
-- On its own because a value added to an enum cannot be used in the
-- transaction that adds it; the next migration grants it.

ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'events.apply_as_staff';

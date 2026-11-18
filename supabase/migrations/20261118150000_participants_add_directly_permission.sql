-- WEB-56: the permission to put a person on an event without an application.
--
-- On its own because a value added to an enum cannot be used in the
-- transaction that adds it; the next migration grants it.

ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'participants.add_directly';

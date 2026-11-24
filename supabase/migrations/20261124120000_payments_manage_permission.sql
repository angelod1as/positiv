-- WEB-69: the permission to see and handle payments inside the admin area.
--
-- admin.panel opens the admin area; payments.manage is what a person needs on
-- top of it to see payment data, record payments and change payment settings.
--
-- On its own because a value added to an enum cannot be used in the
-- transaction that adds it; the next migration grants it.

ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'payments.manage';

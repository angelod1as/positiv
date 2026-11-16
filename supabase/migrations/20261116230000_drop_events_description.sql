-- WEB-50: the event description is gone from the app since the previous
-- deploy, so nothing reads or writes the column any more.
ALTER TABLE public.events DROP COLUMN IF EXISTS description;

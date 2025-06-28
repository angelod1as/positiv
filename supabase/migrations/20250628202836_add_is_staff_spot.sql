-- Add is_staff_spot column to event_participants

ALTER TABLE public.event_participants ADD COLUMN is_staff_spot boolean DEFAULT false;

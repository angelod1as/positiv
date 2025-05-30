-- Add is_social_spot column to event_participants

ALTER TABLE public.event_participants ADD COLUMN is_social_spot boolean DEFAULT false;

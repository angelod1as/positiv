-- Add flag columns to event_participants table
ALTER TABLE public.event_participants
ADD COLUMN flag public.profile_flag_enum NOT NULL DEFAULT 'none',
ADD COLUMN flag_notes text;
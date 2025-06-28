-- Add column admin_general_notes to the event_participants table — general notes on the participation of a person on a given event

ALTER TABLE public.event_participants ADD COLUMN admin_general_notes text;

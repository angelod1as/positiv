-- Add columns to track Listmonk mailing list association for events
ALTER TABLE public.events
ADD COLUMN listmonk_list_id INTEGER NULL,
ADD COLUMN listmonk_list_synced_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN public.events.listmonk_list_id IS 'The ID of the associated Listmonk mailing list for event subscribers. NULL if no list has been created.';
COMMENT ON COLUMN public.events.listmonk_list_synced_at IS 'Timestamp of when the Listmonk list was last synced with event participants. Used for staleness detection.';

-- Add referred column to event_participants table
ALTER TABLE event_participants
ADD COLUMN referred text NOT NULL DEFAULT '';

-- Add comment for clarity
COMMENT ON COLUMN event_participants.referred IS 'Who referred this participant to Positiv. Required field with empty string as default for existing records.';

-- First, set all null payments to zero
UPDATE event_participants
SET payments = 0
WHERE payments IS null;

-- Then, set payment column to NOT NULL and DEFAULT 0
ALTER TABLE event_participants
ALTER COLUMN payments SET DEFAULT 0;

ALTER TABLE event_participants
ALTER COLUMN payments SET NOT NULL;

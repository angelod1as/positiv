-- First, set all null payment to zero
UPDATE event_participants
SET payment = 0
WHERE payment IS null;

-- Then, set payment column to NOT NULL and DEFAULT 0
ALTER TABLE event_participants
ALTER COLUMN payment SET DEFAULT 0;

ALTER TABLE event_participants
ALTER COLUMN payment SET NOT NULL;

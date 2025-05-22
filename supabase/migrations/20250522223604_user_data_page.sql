-- Adding three new text columns to event_participants
ALTER TABLE event_participants
ADD COLUMN referrals text,
ADD COLUMN companions text,
ADD COLUMN bond text;

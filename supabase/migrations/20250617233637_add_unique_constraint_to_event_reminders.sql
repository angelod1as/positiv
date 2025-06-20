-- Create a constraint in the event_reminders table to make onConflict queries possible

ALTER TABLE event_reminders
ADD CONSTRAINT event_reminders_unique_event_profile
UNIQUE (event_id, profile_id);

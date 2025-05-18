-- Migration normalising the event's table column names

ALTER TABLE events RENAME COLUMN starting_time TO time_event_start;
ALTER TABLE events RENAME COLUMN ending_time TO time_event_end;
ALTER TABLE events RENAME COLUMN application_open_time TO time_application_start;
ALTER TABLE events RENAME COLUMN application_close_time TO time_application_end;
ALTER TABLE events RENAME COLUMN group_open_date TO time_group_start;
ALTER TABLE events RENAME COLUMN group_close_date TO time_group_end;
ALTER TABLE events RENAME COLUMN interview_process_start TO time_interviews_start;
ALTER TABLE events RENAME COLUMN interview_process_end TO time_interviews_end;
ALTER TABLE events RENAME COLUMN payment_end_date TO time_payment_start;
ALTER TABLE events RENAME COLUMN payment_start_date TO time_payment_end;

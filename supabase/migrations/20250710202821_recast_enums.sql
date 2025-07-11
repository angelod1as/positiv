------ Change ENUMs

----
-- ATTENDANCE_STATUS
----

-- Rename old ENUM from Status
ALTER TYPE attendance_status_enum RENAME TO attendance_status_enum_old;
-- Create new type
CREATE TYPE attendance_status_enum AS ENUM (
    'pending',
    'attended',
    'not-attended',
    'skipped',
    'will-not-go'
);

-- Update status to take removed enum into account
-- (This leads to data loss, not much to do now,
-- we did the update in the last migration)
UPDATE public.event_participants
SET attendance_status = 'pending'
WHERE attendance_status = 'rejected';

-- Drop default for column
ALTER TABLE public.event_participants ALTER attendance_status DROP DEFAULT;

-- Change type
ALTER TABLE public.event_participants
ALTER COLUMN attendance_status TYPE attendance_status_enum USING attendance_status::text::attendance_status_enum;

-- Add default
ALTER TABLE public.event_participants ALTER attendance_status SET DEFAULT 'pending'::attendance_status_enum;

-- Drop old types
DROP TYPE attendance_status_enum_old;

----
-- APPLICATION_STATUS
----

-- Rename the existing enum type
ALTER TYPE application_status_enum RENAME TO application_status_enum_old;

-- Create the new enum
CREATE TYPE application_status_enum AS ENUM (
    'pending',
    'talking',
    'sent_payment_data',
    'sent_rules',
    'think_better',
    'finalised'
);

-- Drop the default for the column
ALTER TABLE public.event_participants ALTER application_status DROP DEFAULT;

-- Change the column's type to the new enum.
-- This also handles the conversion of 'applied' to 'pending' using a CASE statement
-- within the USING clause, which is safer than a separate UPDATE.
ALTER TABLE public.event_participants
ALTER COLUMN application_status TYPE application_status_enum USING
CASE application_status::text
    WHEN 'applied' THEN 'pending'::text
    ELSE application_status::text
END::application_status_enum;

-- Add the new default.
ALTER TABLE public.event_participants ALTER application_status SET DEFAULT 'pending'::application_status_enum;

-- Drop the old enum type.
DROP TYPE application_status_enum_old;

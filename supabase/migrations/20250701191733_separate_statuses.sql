BEGIN;

-- Step 1: Create the new ENUM types and columns

-- Create ENUM type for application_status
CREATE TYPE application_status_enum AS ENUM (
    'applied',
    'talking',
    'sent_payment_data',
    'sent_rules',
    'think_better',
    'finalised'
);

-- Create ENUM type for attendance_status
CREATE TYPE attendance_status_enum AS ENUM (
    'pending',
    'attended',
    'not-attended',
    'rejected',
    'skipped',
    'will-not-go'
);

-- Add application_status column to event_participants
ALTER TABLE public.event_participants
ADD COLUMN application_status application_status_enum NOT NULL DEFAULT 'applied';

-- Add attendance_status column to event_participants
-- It's nullable and defaults to pending
ALTER TABLE public.event_participants
ADD COLUMN attendance_status attendance_status_enum NOT NULL DEFAULT 'pending';

-- Add has_paid column to event_participants
ALTER TABLE public.event_participants
ADD COLUMN has_paid boolean NOT NULL DEFAULT false;


-- Step 2: Query existing process_status and distribute values

UPDATE public.event_participants
SET
    application_status = CASE process_status
        WHEN 'applied' THEN 'applied'::application_status_enum
        WHEN 'talking' THEN 'talking'::application_status_enum
        WHEN 'sent_payment_data' THEN 'sent_payment_data'::application_status_enum
        WHEN 'paid' THEN 'sent_payment_data'::application_status_enum -- 'paid' maps to sent_payment_data for application_status
        WHEN 'sent_rules' THEN 'sent_rules'::application_status_enum
        WHEN 'think_better' THEN 'think_better'::application_status_enum
        WHEN 'attended' THEN 'finalised'::application_status_enum
        WHEN 'not-attended' THEN 'finalised'::application_status_enum
        WHEN 'rejected' THEN 'finalised'::application_status_enum
        WHEN 'skipped' THEN 'finalised'::application_status_enum
        -- WHEN 'will-not-go' THEN 'finalised'::application_status_enum -- Assuming this would also be finalised if it existed in process_status
        ELSE 'applied'::application_status_enum -- Fallback, though existing ENUM should cover all cases
    END,
    attendance_status = CASE process_status
        WHEN 'attended' THEN 'attended'::attendance_status_enum
        WHEN 'not-attended' THEN 'not-attended'::attendance_status_enum
        WHEN 'rejected' THEN 'rejected'::attendance_status_enum
        WHEN 'skipped' THEN 'skipped'::attendance_status_enum
        WHEN 'will-not-go' THEN 'will-not-go'::attendance_status_enum -- Ensure this is handled if it's a possible value from old column
        ELSE 'pending' -- For all other process_status values, attendance_status defaults to 'pending'
    END,
    has_paid = CASE process_status
        WHEN 'paid' THEN true
        WHEN 'sent_rules' THEN true
        WHEN 'attended' THEN true
        WHEN 'not-attended' THEN true
        -- Add other cases that imply payment here if any
        ELSE false
    END;

-- Finally, delete the old process_status column
ALTER TABLE public.event_participants
DROP COLUMN process_status;

COMMIT;

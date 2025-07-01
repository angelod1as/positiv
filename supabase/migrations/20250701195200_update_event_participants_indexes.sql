-- Migration: Update event_participants indexes for new status columns

-- Drop the old index on process_status
DROP INDEX IF EXISTS public.idx_event_participants_process_status;

-- Create new indexes for the new status columns
-- Index for application_status
CREATE INDEX IF NOT EXISTS idx_event_participants_application_status
ON public.event_participants (application_status);

-- Index for attendance_status
CREATE INDEX IF NOT EXISTS idx_event_participants_attendance_status
ON public.event_participants (attendance_status);

-- Index for has_paid
CREATE INDEX IF NOT EXISTS idx_event_participants_has_paid
ON public.event_participants (has_paid);

-- Comment on new indexes
COMMENT ON INDEX public.idx_event_participants_application_status IS 'Index to optimize filtering by application_status';
COMMENT ON INDEX public.idx_event_participants_attendance_status IS 'Index to optimize filtering by attendance_status';
COMMENT ON INDEX public.idx_event_participants_has_paid IS 'Index to optimize filtering by payment status';

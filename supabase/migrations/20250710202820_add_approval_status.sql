CREATE TYPE public.approved_to_attend_enum AS ENUM (
    'pending',
    'approved',
    'approved_with_reservations',
    'rejected'
);

-- Add new column
ALTER TABLE public.profiles
ADD COLUMN approved_to_attend public.approved_to_attend_enum NOT NULL DEFAULT 'pending';

-- Drop Approved Column
ALTER TABLE public.profiles
DROP COLUMN approved;

UPDATE public.profiles AS pp
SET approved_to_attend = 'rejected'
FROM public.event_participants AS pep
WHERE pep.profile_id = pp.id
    AND pep.attendance_status = 'rejected';

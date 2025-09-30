-- Add became_veteran_date column to profiles table
ALTER TABLE public.profiles
ADD COLUMN became_veteran_date TIMESTAMP WITH TIME ZONE;

-- Backfill became_veteran_date for existing veterans
-- Set it to the date of their first attended event
UPDATE public.profiles p
SET became_veteran_date = (
  SELECT MIN(e.time_event_start)
  FROM public.event_participants ep
  JOIN public.events e ON ep.event_id = e.id
  WHERE ep.profile_id = p.id
    AND ep.attendance_status = 'attended'
)
WHERE p.is_veteran = true;

-- Update the trigger function to set became_veteran_date when making someone a veteran
CREATE OR REPLACE FUNCTION public.update_veteran_status()
RETURNS trigger AS $$
BEGIN
  SET search_path = public;

  IF NEW.attendance_status = 'attended' THEN
    UPDATE public.profiles
    SET
      is_veteran = true,
      became_veteran_date = COALESCE(
        became_veteran_date,
        (SELECT time_event_start FROM public.events WHERE id = NEW.event_id)
      )
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.profiles.became_veteran_date
IS 'Timestamp when the profile became a veteran (attended their first event)';
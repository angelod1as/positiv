-- Migration: Update veteran status trigger to use new status columns

-- Drop the existing trigger
DROP TRIGGER IF EXISTS set_veteran_status ON public.event_participants;

-- Update the function to use the new attendance_status column
CREATE OR REPLACE FUNCTION public.update_veteran_status()
RETURNS trigger AS $$
BEGIN
  -- Set search path
  SET search_path = public;

  -- If the attendance_status is being set to 'attended'
  IF NEW.attendance_status = 'attended' THEN
    -- Update the profile's veteran status
    UPDATE public.profiles
    SET is_veteran = true
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the owner of the function
ALTER FUNCTION public.update_veteran_status() OWNER TO postgres;

-- Create trigger to automatically update veteran status
CREATE TRIGGER set_veteran_status
AFTER INSERT OR UPDATE ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_veteran_status();

-- Grant execution permissions
GRANT ALL ON FUNCTION public.update_veteran_status() TO service_role;
REVOKE ALL ON FUNCTION public.update_veteran_status() FROM anon, authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.update_veteran_status()
IS 'SECURITY DEFINER function to update the is_veteran status in profiles when a participant attends an event.';

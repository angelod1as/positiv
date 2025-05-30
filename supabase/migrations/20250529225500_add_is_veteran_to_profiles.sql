-- Migration: Add is_veteran column to profiles table and create trigger to maintain it

-- Add is_veteran column to profiles table
ALTER TABLE public.profiles ADD COLUMN is_veteran boolean DEFAULT false;

-- Create function to update veteran status
CREATE OR REPLACE FUNCTION public.update_veteran_status()
RETURNS trigger AS $$
BEGIN
  -- Set search path
  SET search_path = public;

  -- If the status is being set to 'attended'
  IF NEW.process_status = 'attended' THEN
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

-- Initialize existing veteran statuses
UPDATE public.profiles p
SET is_veteran = true
WHERE EXISTS (
        SELECT 1 FROM public.event_participants evt_part
        WHERE evt_part.profile_id = p.id
            AND evt_part.process_status = 'attended'
    );

-- Grant execution permissions
GRANT ALL ON FUNCTION public.update_veteran_status() TO service_role;
REVOKE ALL ON FUNCTION public.update_veteran_status() FROM anon, authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.update_veteran_status()
IS 'SECURITY DEFINER function to update the is_veteran status in profiles when a participant attends an event.';

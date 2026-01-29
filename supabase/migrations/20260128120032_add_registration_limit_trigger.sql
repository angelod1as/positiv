-- Migration: Add registration limit trigger to close events at 90 participants

-- First, recreate the get_applied_participants_count function using new status columns
CREATE OR REPLACE FUNCTION public.get_applied_participants_count(event_id_input uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT COUNT(*)
FROM event_participants
WHERE event_id = event_id_input
  AND is_user_applied = TRUE;
$$;

ALTER FUNCTION public.get_applied_participants_count(uuid) OWNER TO postgres;

GRANT ALL ON FUNCTION public.get_applied_participants_count(uuid) TO anon;
GRANT ALL ON FUNCTION public.get_applied_participants_count(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_applied_participants_count(uuid) TO service_role;

COMMENT ON FUNCTION public.get_applied_participants_count(uuid)
IS 'Counts all participants for a given event where is_user_applied is TRUE.';

-- Create trigger function to close registrations when limit reached
CREATE OR REPLACE FUNCTION public.close_registrations_at_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_count bigint;
  current_status event_status;
BEGIN
  -- Only process if this is a user application (not admin-added)
  IF NEW.is_user_applied = TRUE THEN

    -- Get current event status
    SELECT event_status INTO current_status
    FROM events
    WHERE id = NEW.event_id;

    -- Only check limit if registrations are open
    IF current_status = 'Registration Open' THEN

      -- Count applied participants (uses existing function)
      SELECT get_applied_participants_count(NEW.event_id) INTO participant_count;

      -- Close registrations if limit reached (90 participants)
      IF participant_count >= 90 THEN
        UPDATE events
        SET event_status = 'Registration Closed'
        WHERE id = NEW.event_id
          AND event_status = 'Registration Open';
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.close_registrations_at_limit() OWNER TO postgres;

GRANT ALL ON FUNCTION public.close_registrations_at_limit() TO service_role;
REVOKE ALL ON FUNCTION public.close_registrations_at_limit() FROM anon, authenticated;

COMMENT ON FUNCTION public.close_registrations_at_limit()
IS 'SECURITY DEFINER trigger function that automatically closes event registrations when 90 participants are reached.';

-- Create trigger that fires after insert on event_participants
CREATE TRIGGER trigger_close_registrations_at_limit
AFTER INSERT ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.close_registrations_at_limit();

COMMENT ON TRIGGER trigger_close_registrations_at_limit ON public.event_participants
IS 'Automatically closes event registrations when 90 participants apply (is_user_applied = TRUE).';

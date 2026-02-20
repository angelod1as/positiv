-- Fix close_registrations_at_limit trigger function
-- Production had a type mismatch bug: status_changed declared as boolean but compared with > 0 (integer)
-- Fix: status_changed must be bigint to receive GET DIAGNOSTICS ROW_COUNT
-- Additionally, make the trigger non-blocking: any future errors are logged as warnings
-- and never prevent a user from completing their registration

CREATE OR REPLACE FUNCTION public.close_registrations_at_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_count bigint;
  current_status event_status;
  status_changed bigint := 0;
BEGIN
  IF NEW.is_user_applied = TRUE THEN
    SELECT event_status INTO current_status
    FROM events
    WHERE id = NEW.event_id;

    IF current_status = 'Registration Open' THEN
      SELECT get_applied_participants_count(NEW.event_id) INTO participant_count;

      IF participant_count >= 90 THEN
        UPDATE events
        SET event_status = 'Registration Closed'
        WHERE id = NEW.event_id
          AND event_status = 'Registration Open';

        GET DIAGNOSTICS status_changed = ROW_COUNT;

        IF status_changed > 0 THEN
          PERFORM notify_registration_limit_reached(NEW.event_id);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'close_registrations_at_limit: non-blocking error for event_id=%, participant_id=%: %',
      NEW.event_id, NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.close_registrations_at_limit() OWNER TO postgres;

GRANT ALL ON FUNCTION public.close_registrations_at_limit() TO service_role;
REVOKE ALL ON FUNCTION public.close_registrations_at_limit() FROM anon, authenticated;

COMMENT ON FUNCTION public.close_registrations_at_limit()
IS 'Non-blocking trigger that closes event registrations at 90 applied participants and sends admin email notification. Errors are logged as warnings and never block the registration INSERT.';

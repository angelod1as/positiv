-- The registration-limit admin email never reached anyone (POS-626): the
-- notification read a vault function that does not exist and an app.url setting
-- nothing sets, so event_registration_limit_emails stayed empty. The app no
-- longer has the endpoint it called, so the trigger stops calling it and the
-- plumbing goes.

CREATE OR REPLACE FUNCTION public.close_registrations_at_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_count bigint;
  registration_limit integer;
  current_status event_status;
BEGIN
  IF NEW.is_user_applied = TRUE THEN
    SELECT event_status INTO current_status
    FROM events
    WHERE id = NEW.event_id;

    IF current_status = 'Registration Open' THEN
      SELECT get_counted_applied_participants_count(NEW.event_id) INTO participant_count;

      SELECT COALESCE((SELECT s.registration_limit FROM app_settings s), 90)
      INTO registration_limit;

      IF participant_count >= registration_limit THEN
        UPDATE events
        SET event_status = 'Registration Closed'
        WHERE id = NEW.event_id
          AND event_status = 'Registration Open';
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

DROP FUNCTION IF EXISTS public.notify_registration_limit_reached(uuid);

DROP TABLE IF EXISTS public.event_registration_limit_emails;

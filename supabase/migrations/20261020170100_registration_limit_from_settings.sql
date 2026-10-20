-- Registrations close at the limit in app_settings instead of a hardcoded 90,
-- and cis het men no longer use up spots: they can still apply while
-- registrations are open, but are left out of the count.
--
-- A new counting function rather than a change to
-- get_applied_participants_count, so the applied count keeps its meaning.

CREATE OR REPLACE FUNCTION public.get_counted_applied_participants_count(event_id_input uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM event_participants ep
  JOIN profiles p ON p.id = ep.profile_id
  WHERE ep.event_id = event_id_input
    AND ep.is_user_applied = TRUE
    AND p.approved_to_attend != 'rejected'
    -- COALESCE keeps a null gender or orientation counted: without it the
    -- comparison is null and the row would drop out of the count.
    AND NOT COALESCE(
      p.gender = ARRAY['Homem cis']::text[]
        AND p.orientation = ARRAY['Hétero']::text[],
      false
    );
$$;

ALTER FUNCTION public.get_counted_applied_participants_count(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_counted_applied_participants_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.get_counted_applied_participants_count(uuid) TO service_role;

COMMENT ON FUNCTION public.get_counted_applied_participants_count(uuid)
IS 'Applied participants that count toward the registration limit: not rejected, and not a cis het man (gender exactly {Homem cis} and orientation exactly {Hétero}).';

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
  status_changed bigint := 0;
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

COMMENT ON FUNCTION public.close_registrations_at_limit()
IS 'Non-blocking trigger that closes event registrations once the counted applications reach app_settings.registration_limit. Errors are logged as warnings and never block the registration INSERT.';

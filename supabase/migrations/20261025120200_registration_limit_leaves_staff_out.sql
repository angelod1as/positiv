-- POS-623: staff spots are outside the registration limit.
--
-- Staff apply to the events they work, and that must never close
-- registration for the participants. CREATE OR REPLACE keeps the function's
-- grants.

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
    AND ep.spot_type <> 'staff'
    AND p.approved_to_attend != 'rejected'
    AND NOT COALESCE(
      p.gender = ARRAY['Homem cis']::text[]
        AND p.orientation = ARRAY['Hétero']::text[],
      false
    );
$$;

COMMENT ON FUNCTION public.get_counted_applied_participants_count(uuid)
IS 'Applied participants that count toward the registration limit: not a staff spot, not rejected, and not a cis het man (gender exactly {Homem cis} and orientation exactly {Hétero}).';

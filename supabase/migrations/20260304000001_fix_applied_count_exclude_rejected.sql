-- Fix get_applied_participants_count to exclude rejected participants
-- Profiles with approved_to_attend = 'rejected' should not count toward
-- the registration limit, just as they don't count in the stats table.

CREATE OR REPLACE FUNCTION public.get_applied_participants_count(event_id_input uuid)
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
    AND p.approved_to_attend != 'rejected';
$$;

ALTER FUNCTION public.get_applied_participants_count(uuid) OWNER TO postgres;

GRANT ALL ON FUNCTION public.get_applied_participants_count(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_applied_participants_count(uuid) FROM anon, authenticated;

COMMENT ON FUNCTION public.get_applied_participants_count(uuid)
IS 'Returns the count of applied participants for an event, excluding profiles marked as rejected.';

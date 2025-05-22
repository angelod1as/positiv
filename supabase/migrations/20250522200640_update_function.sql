-- Create or replace the function
CREATE OR REPLACE FUNCTION public.get_applied_participants_count(event_id_input uuid)
RETURNS bigint -- The count of rows
LANGUAGE sql -- Written in pure SQL
STABLE
AS $$
-- Select the count of rows from event_participants
SELECT COUNT(*)
FROM event_participants
WHERE event_id = event_id_input -- Filter for the specific event provided as input
  AND process_status = 'applied' -- Filter for participants with 'applied' status
  AND is_user_applied = TRUE; -- Filter where the applied status flag is true
$$;

-- Set the owner
ALTER FUNCTION public.get_applied_participants_count(uuid) OWNER TO postgres;

-- Grant execution permissions (allows roles to call this function)
GRANT ALL ON FUNCTION public.get_applied_participants_count(uuid) TO anon;
GRANT ALL ON FUNCTION public.get_applied_participants_count(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_applied_participants_count(uuid) TO service_role;

-- Add a comment for documentation
COMMENT ON FUNCTION public.get_applied_participants_count(
    uuid
) IS 'Counts participants for a given event with process_status ''applied'' and is_user_applied TRUE.';

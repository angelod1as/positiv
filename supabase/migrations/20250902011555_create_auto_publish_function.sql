-- Create function to automatically update event statuses
CREATE OR REPLACE FUNCTION public.update_event_statuses_automatically()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_ids uuid[];
  updated_count integer;
BEGIN
  -- Update events from Scheduled to Registration Open when:
  -- 1. Current status is "Scheduled"
  -- 2. auto_publish is true
  -- 3. time_application_start has passed (is less than or equal to current time)
  -- 4. time_event_start is still in the future (prevent opening past events)
  WITH updated_events AS (
    UPDATE public.events
    SET 
      event_status = 'Registration Open'
    WHERE 
      event_status = 'Scheduled'
      AND auto_publish = true
      AND time_application_start IS NOT NULL
      AND time_application_start <= NOW()
      AND time_event_start IS NOT NULL
      AND time_event_start > NOW()
    RETURNING id
  )
  SELECT 
    array_agg(id),
    COUNT(*)
  INTO 
    updated_ids,
    updated_count
  FROM updated_events;

  -- Return result as JSON
  RETURN jsonb_build_object(
    'success', true,
    'count', COALESCE(updated_count, 0),
    'updated', COALESCE(updated_ids, ARRAY[]::uuid[]),
    'timestamp', NOW()
  );
END;
$$;

-- Grant execute permission to the service role (for cron jobs)
GRANT EXECUTE ON FUNCTION public.update_event_statuses_automatically() TO service_role;

-- Add comment to document the function
COMMENT ON FUNCTION public.update_event_statuses_automatically() IS 'Automatically transitions events from Scheduled to Registration Open status when their application start time is reached and auto_publish is enabled. Returns JSON with count and IDs of updated events.';
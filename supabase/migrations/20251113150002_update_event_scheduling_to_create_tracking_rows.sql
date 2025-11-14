-- Update event scheduling function to create campaign tracking rows
-- When events transition from Scheduled to Registration Open,
-- automatically create tracking rows for newsletter campaigns

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

  -- Create campaign tracking rows for newly opened events
  -- Use ON CONFLICT DO NOTHING for idempotency (handles case where tracking row already exists)
  IF updated_ids IS NOT NULL THEN
    INSERT INTO public.event_newsletter_campaigns (
      event_id,
      campaign_is_created,
      campaign_is_sent,
      times_attempted
    )
    SELECT
      id,
      false,
      false,
      0
    FROM unnest(updated_ids) AS id
    ON CONFLICT (event_id) DO NOTHING;
  END IF;

  -- Return result as JSON
  RETURN jsonb_build_object(
    'success', true,
    'count', COALESCE(updated_count, 0),
    'updated', COALESCE(updated_ids, ARRAY[]::uuid[]),
    'timestamp', NOW()
  );
END;
$$;

-- Update function comment
COMMENT ON FUNCTION public.update_event_statuses_automatically() IS 'Automatically transitions events from Scheduled to Registration Open status when their application start time is reached and auto_publish is enabled. Also creates campaign tracking rows for newsletter automation. Returns JSON with count and IDs of updated events.';

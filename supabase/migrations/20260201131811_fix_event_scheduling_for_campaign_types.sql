-- Fix update_event_statuses_automatically() to work with campaign_type column
-- This updates the function to use the new composite unique key (event_id, campaign_type)
-- and ensures only 'opening' campaigns are created by this function
-- ('pre_opening' campaigns are handled by the trigger_create_event_campaigns trigger)

CREATE OR REPLACE FUNCTION public.update_event_statuses_automatically()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

  -- Create 'opening' campaign tracking rows for newly opened events
  -- Note: 'pre_opening' campaigns are created by trigger_create_event_campaigns
  -- Use ON CONFLICT DO NOTHING for idempotency (handles case where tracking row already exists)
  IF updated_ids IS NOT NULL THEN
    INSERT INTO public.event_newsletter_campaigns (
      event_id,
      campaign_type,
      should_send_at,
      campaign_is_created,
      campaign_is_sent,
      times_attempted
    )
    SELECT
      e.id,
      'opening',
      e.time_application_start,
      false,
      false,
      0
    FROM unnest(updated_ids) AS event_id
    JOIN public.events e ON e.id = event_id
    ON CONFLICT (event_id, campaign_type) DO NOTHING;
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

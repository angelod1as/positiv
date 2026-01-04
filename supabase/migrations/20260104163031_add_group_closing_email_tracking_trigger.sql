-- Extend event scheduling function to create group closing email tracking rows
-- When time_group_start is reached, automatically create tracking rows for group closing transactional emails

CREATE OR REPLACE FUNCTION public.update_event_statuses_automatically()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_ids uuid[];
  updated_count integer;
  group_closing_ids uuid[];
  group_closing_count integer;
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

  -- Create group closing email tracking rows for events where time_group_start has been reached
  -- Only process events from the last 24 hours to avoid reprocessing old events
  WITH group_closing_events AS (
    SELECT id
    FROM public.events
    WHERE time_group_start IS NOT NULL
      AND time_group_start <= NOW()
      AND time_group_start > NOW() - INTERVAL '24 hours'
  )
  SELECT
    array_agg(id),
    COUNT(*)
  INTO
    group_closing_ids,
    group_closing_count
  FROM group_closing_events;

  -- Insert tracking rows for group closing emails
  -- Use ON CONFLICT DO NOTHING for idempotency
  IF group_closing_ids IS NOT NULL THEN
    INSERT INTO public.event_transactional_emails (
      event_id,
      email_type,
      emails_sent,
      times_attempted
    )
    SELECT
      id,
      'group_closing',
      false,
      0
    FROM unnest(group_closing_ids) AS id
    ON CONFLICT (event_id, email_type) DO NOTHING;
  END IF;

  -- Return result as JSON
  RETURN jsonb_build_object(
    'success', true,
    'status_updates', jsonb_build_object(
      'count', COALESCE(updated_count, 0),
      'updated', COALESCE(updated_ids, ARRAY[]::uuid[])
    ),
    'group_closing_tracking', jsonb_build_object(
      'count', COALESCE(group_closing_count, 0),
      'created', COALESCE(group_closing_ids, ARRAY[]::uuid[])
    ),
    'timestamp', NOW()
  );
END;
$$;

-- Update function comment
COMMENT ON FUNCTION public.update_event_statuses_automatically() IS 'Automatically transitions events from Scheduled to Registration Open status when their application start time is reached and auto_publish is enabled. Also creates campaign tracking rows for newsletter automation and group closing email tracking rows when time_group_start is reached. Returns JSON with counts and IDs of updated events and created tracking rows.';

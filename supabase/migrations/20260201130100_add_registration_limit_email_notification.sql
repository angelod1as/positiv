-- Migration: Add email notification when registration limit is reached
-- Related: POS-438 - Admin email notifications

-- Helper function to send HTTP notification
-- This function is called by the trigger to notify the app to send emails
CREATE OR REPLACE FUNCTION public.notify_registration_limit_reached(event_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already_notified boolean;
  app_url text;
  internal_job_secret text;
BEGIN
  -- Check if notification was already sent for this event
  SELECT EXISTS(
    SELECT 1 FROM event_registration_limit_emails
    WHERE event_id = event_id_param
  ) INTO already_notified;

  -- Don't send duplicate notifications
  IF already_notified THEN
    RETURN;
  END IF;

  -- Get the app URL from environment (set via Supabase dashboard)
  -- Falls back to localhost for local development
  app_url := COALESCE(
    current_setting('app.url', true),
    'http://localhost:5173'
  );

  -- Get the internal job secret for authentication
  internal_job_secret := COALESCE(
    vault.get_secret_value('INTERNAL_JOB_SECRET'),
    current_setting('app.internal_job_secret', true)
  );

  -- Verify secret is available
  IF internal_job_secret IS NULL THEN
    RAISE WARNING 'INTERNAL_JOB_SECRET not configured - cannot send notification for event %', event_id_param;
    RETURN;
  END IF;

  -- Call the API endpoint asynchronously using pg_net
  -- This won't block the trigger execution
  PERFORM net.http_post(
    url := app_url || '/api/admin/send-registration-limit-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || internal_job_secret
    ),
    body := json_build_object('eventId', event_id_param)::text
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Failed to notify registration limit reached for event %: %', event_id_param, SQLERRM;
END;
$$;

ALTER FUNCTION public.notify_registration_limit_reached(uuid) OWNER TO postgres;

GRANT ALL ON FUNCTION public.notify_registration_limit_reached(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.notify_registration_limit_reached(uuid) FROM anon, authenticated;

COMMENT ON FUNCTION public.notify_registration_limit_reached(uuid)
IS 'Sends HTTP notification to app when event reaches registration limit. Prevents duplicate notifications.';

-- Update the existing trigger function to include email notification
CREATE OR REPLACE FUNCTION public.close_registrations_at_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_count bigint;
  current_status event_status;
  status_changed boolean := FALSE;
BEGIN
  -- Only process if this is a user application (not admin-added)
  IF NEW.is_user_applied = TRUE THEN

    -- Get current event status
    SELECT event_status INTO current_status
    FROM events
    WHERE id = NEW.event_id;

    -- Only check limit if registrations are open
    IF current_status = 'Registration Open' THEN

      -- Count applied participants (uses existing function)
      SELECT get_applied_participants_count(NEW.event_id) INTO participant_count;

      -- Close registrations if limit reached (90 participants)
      IF participant_count >= 90 THEN
        UPDATE events
        SET event_status = 'Registration Closed'
        WHERE id = NEW.event_id
          AND event_status = 'Registration Open';

        -- Check if status was actually changed
        GET DIAGNOSTICS status_changed = ROW_COUNT;

        -- Send email notification if status changed from Open to Closed
        IF status_changed > 0 THEN
          PERFORM notify_registration_limit_reached(NEW.event_id);
        END IF;
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.close_registrations_at_limit()
IS 'SECURITY DEFINER trigger function that automatically closes event registrations at 90 participants and sends admin email notification.';

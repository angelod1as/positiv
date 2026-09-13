-- POS-539: pin search_path on the functions that still resolve names loosely.
--
-- set_selected_for_rotation and create_event_campaigns declare no search_path at
-- all. add_user_role, update_veteran_status and set_selected_for_rotation each
-- declare one and then run `SET search_path = public` as their first statement,
-- which discards it — a function that looks fixed in pg_proc.proconfig and is
-- not. Bodies are schema-qualified instead.
--
-- Privileges are untouched: CREATE OR REPLACE keeps the existing ACL, which the
-- earlier migration in this branch already narrowed.

CREATE OR REPLACE FUNCTION public.add_user_role(
    p_user_id uuid,
    p_role_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role_name)
  VALUES (p_user_id, p_role_name)
  ON CONFLICT (user_id, role_name) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_veteran_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.attendance_status = 'attended' THEN
    UPDATE public.profiles
    SET
      is_veteran = true,
      became_veteran_date = COALESCE(
        became_veteran_date,
        (SELECT time_event_start FROM public.events WHERE id = NEW.event_id)
      )
    WHERE id = NEW.profile_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_selected_for_rotation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only set to true when attendance_status is 'skipped'
  -- Never set it back to false (once selected, always marked)
  IF NEW.attendance_status = 'skipped' AND NEW.was_selected_for_rotation = false THEN
    NEW.was_selected_for_rotation := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_event_campaigns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  -- Skip if time_application_start didn't change (optimization for UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.time_application_start IS NOT DISTINCT FROM NEW.time_application_start THEN
    RETURN NEW;
  END IF;

  -- Only if time_application_start is in the future
  IF NEW.time_application_start > NOW() THEN

    -- Pre-opening campaign (3 days before)
    INSERT INTO public.event_newsletter_campaigns (
      event_id,
      campaign_type,
      should_send_at,
      campaign_is_created,
      campaign_is_sent,
      times_attempted
    ) VALUES (
      NEW.id,
      'pre_opening',
      NEW.time_application_start - INTERVAL '3 days',
      false,
      false,
      0
    )
    ON CONFLICT (event_id, campaign_type)
    DO UPDATE SET
      should_send_at = NEW.time_application_start - INTERVAL '3 days',
      updated_at = NOW();

    -- Opening campaign (at application start time)
    INSERT INTO public.event_newsletter_campaigns (
      event_id,
      campaign_type,
      should_send_at,
      campaign_is_created,
      campaign_is_sent,
      times_attempted
    ) VALUES (
      NEW.id,
      'opening',
      NEW.time_application_start,
      false,
      false,
      0
    )
    ON CONFLICT (event_id, campaign_type)
    DO UPDATE SET
      should_send_at = NEW.time_application_start,
      updated_at = NOW();

  ELSE
    -- If event moved to the past, mark campaigns as sent to prevent orphaned records
    UPDATE public.event_newsletter_campaigns
    SET
      campaign_is_sent = true,
      campaign_sent_time = COALESCE(campaign_sent_time, NOW()),
      updated_at = NOW()
    WHERE event_id = NEW.id
      AND campaign_is_sent = false;

  END IF;

  RETURN NEW;
END;
$$;

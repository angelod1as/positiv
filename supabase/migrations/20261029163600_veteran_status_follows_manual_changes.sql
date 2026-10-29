-- POS-636: profiles.is_veteran is the rule for "veteran" — true once someone
-- attended a party, or an admin set it by hand. became_veteran_date follows
-- it: set whenever someone becomes a veteran, cleared when an admin unmarks.
--
-- update_veteran_status used to fire on every write to an attended row, so
-- editing that row again undid an admin's unmarking. It now acts only when
-- the attendance becomes 'attended'.

CREATE OR REPLACE FUNCTION public.update_veteran_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.attendance_status = 'attended'
     AND (TG_OP = 'INSERT' OR OLD.attendance_status IS DISTINCT FROM 'attended') THEN
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

CREATE OR REPLACE FUNCTION public.sync_became_veteran_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF NOT COALESCE(NEW.is_veteran, false) THEN
    NEW.became_veteran_date := NULL;
  ELSIF NEW.became_veteran_date IS NULL THEN
    NEW.became_veteran_date := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_became_veteran_date ON public.profiles;

CREATE TRIGGER sync_became_veteran_date
BEFORE UPDATE OF is_veteran ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_became_veteran_date();

UPDATE public.profiles
SET became_veteran_date = NULL
WHERE NOT COALESCE(is_veteran, false)
  AND became_veteran_date IS NOT NULL;

UPDATE public.profiles
SET became_veteran_date = now()
WHERE is_veteran
  AND became_veteran_date IS NULL;

-- WEB-40: guard_admin_only_profile_columns asked authorize() of every caller.
--
-- 20261106120000 wrote `current_user NOT IN (...) OR public.authorize(...)`,
-- and Postgres does not promise to stop at the first true operand of an OR. It
-- evaluated authorize() for service_role too, which holds no EXECUTE on it, so
-- every profile write through the service key failed with "permission denied".
-- Only authenticated holds that grant, and only authenticated is asked now --
-- in an IF of its own, which does stop.
--
-- CREATE OR REPLACE keeps the trigger and the function's grants; the body is
-- otherwise the same.

CREATE OR REPLACE FUNCTION public.guard_admin_only_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  changed text;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF current_user = 'authenticated' THEN
    IF public.authorize('profiles.manage') THEN
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    changed := CASE
      WHEN NEW.cpf_exempt THEN 'cpf_exempt'
      WHEN NEW.approved_to_attend IS DISTINCT FROM 'pending' THEN 'approved_to_attend'
      WHEN coalesce(NEW.is_veteran, false) THEN 'is_veteran'
      WHEN NEW.became_veteran_date IS NOT NULL THEN 'became_veteran_date'
      WHEN NEW.flag IS DISTINCT FROM 'none' THEN 'flag'
      WHEN NEW.flag_notes IS NOT NULL THEN 'flag_notes'
      WHEN NEW.general_notes IS NOT NULL THEN 'general_notes'
      WHEN NEW.provider_customer_id IS NOT NULL THEN 'provider_customer_id'
    END;
  ELSE
    changed := CASE
      WHEN NEW.cpf_exempt IS DISTINCT FROM OLD.cpf_exempt THEN 'cpf_exempt'
      WHEN NEW.approved_to_attend IS DISTINCT FROM OLD.approved_to_attend THEN 'approved_to_attend'
      WHEN NEW.is_veteran IS DISTINCT FROM OLD.is_veteran THEN 'is_veteran'
      WHEN NEW.became_veteran_date IS DISTINCT FROM OLD.became_veteran_date THEN 'became_veteran_date'
      WHEN NEW.flag IS DISTINCT FROM OLD.flag THEN 'flag'
      WHEN NEW.flag_notes IS DISTINCT FROM OLD.flag_notes THEN 'flag_notes'
      WHEN NEW.general_notes IS DISTINCT FROM OLD.general_notes THEN 'general_notes'
      WHEN NEW.provider_customer_id IS DISTINCT FROM OLD.provider_customer_id THEN 'provider_customer_id'
    END;
  END IF;

  IF changed IS NOT NULL THEN
    RAISE EXCEPTION 'profiles.% is admin-only', changed
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

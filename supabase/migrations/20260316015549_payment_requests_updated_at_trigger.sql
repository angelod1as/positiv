-- Follows the security-hardened pattern established by
-- 20251203095427_fix_supabase_security_warnings.sql and
-- 20251226171113_add_updated_at_to_event_participants.sql:
-- SECURITY DEFINER + empty search_path, schema-qualified trigger target.
-- Function name is table-specific (not generic `set_updated_at`) so each
-- table owns its own trigger function, matching repo convention.
CREATE OR REPLACE FUNCTION public.update_payment_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS payment_requests_updated_at_trigger
  ON public.payment_requests;

CREATE TRIGGER payment_requests_updated_at_trigger
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_requests_updated_at();

CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS payments_updated_at_trigger ON public.payments;
CREATE TRIGGER payments_updated_at_trigger
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_payments_updated_at();

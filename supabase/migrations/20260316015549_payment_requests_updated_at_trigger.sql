CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_requests_set_updated_at
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

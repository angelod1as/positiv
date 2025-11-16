-- Helper function to securely retrieve secrets from Supabase Vault
-- Used by pg_cron jobs to access API credentials

CREATE OR REPLACE FUNCTION get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  RETURN secret_value;
END;
$$;

-- Grant execute permission to postgres role (used by pg_cron)
GRANT EXECUTE ON FUNCTION get_vault_secret(text) TO postgres;

COMMENT ON FUNCTION get_vault_secret IS 'Securely retrieve vault secrets for use in pg_cron jobs and database functions';

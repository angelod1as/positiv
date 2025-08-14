-- Enable pg_cron extension for scheduled newsletter processing
-- This migration adds pg_cron which is needed for automated newsletter scheduling

-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions to the service role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Add comment to document the purpose
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for scheduled newsletter processing';
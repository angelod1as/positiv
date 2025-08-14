-- Enable pg_cron and pg_net extensions for scheduled newsletter processing
-- This migration adds pg_cron for scheduling and pg_net for HTTP calls

-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for making HTTP calls from the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions to the service role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT USAGE ON SCHEMA net TO postgres;

-- Add comments to document the purpose
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for scheduled newsletter processing';
COMMENT ON EXTENSION pg_net IS 'HTTP client for PostgreSQL - used for triggering edge functions';
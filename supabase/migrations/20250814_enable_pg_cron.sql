-- Migration: Enable pg_cron extension for scheduled newsletter processing
-- This extension allows us to schedule periodic jobs within the database

-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions to the service role
-- pg_cron runs in the postgres database, so we need to grant access there
GRANT USAGE ON SCHEMA cron TO postgres;

-- Add comment to document the purpose
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for scheduled newsletter processing';
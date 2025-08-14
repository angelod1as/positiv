-- Migration: Set up cron job to process scheduled newsletters every 5 minutes
-- This cron job will call the Supabase Edge Function to process newsletters

-- Note: pg_cron jobs run in the postgres database, not in the application database
-- They use HTTP to call edge functions

-- First, ensure we can make HTTP calls
CREATE EXTENSION IF NOT EXISTS http;

-- Create a cron job that runs every 5 minutes
-- Note: This will only work in production Supabase where pg_cron is properly configured
-- For local development, use the trigger_newsletter_processing() function instead
DO $$
BEGIN
  -- Check if cron schema exists (it won't in local development)
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.schedule(
      'process-scheduled-newsletters', -- job name
      '*/5 * * * *', -- every 5 minutes
      $JOB$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-newsletters',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
      $JOB$
    );
    RAISE NOTICE 'Cron job for newsletter processing created successfully';
  ELSE
    RAISE NOTICE 'Cron schema not available (expected in local development). Use trigger_newsletter_processing() function for manual processing.';
  END IF;
END $$;

-- Create a function to manually trigger newsletter processing (useful for testing)
-- Note: This uses placeholder values for local development
-- In production, these settings should be configured properly
CREATE OR REPLACE FUNCTION public.trigger_newsletter_processing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  supabase_url text;
  service_key text;
BEGIN
  -- Try to get settings, use defaults for local development if not available
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    IF supabase_url IS NULL THEN
      supabase_url := 'http://localhost:54321';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      supabase_url := 'http://localhost:54321';
  END;
  
  BEGIN
    service_key := current_setting('app.settings.supabase_service_role_key', true);
    IF service_key IS NULL THEN
      -- Return error for local development
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service role key not configured. Edge function cannot be called from database in local development.'
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Return error for local development
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Service role key not configured. Edge function cannot be called from database in local development.'
      );
  END;
  
  -- This function can be called manually to trigger newsletter processing
  -- It's useful for testing without waiting for the cron job
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/process-newsletters',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.trigger_newsletter_processing() TO service_role;

-- Add comment to the function
COMMENT ON FUNCTION public.trigger_newsletter_processing() IS 'Manually triggers the newsletter processing edge function - useful for testing';
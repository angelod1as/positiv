-- Set up cron job for newsletter processing
-- This migration creates a scheduled job that triggers newsletter processing every 5 minutes

-- Only create the cron job in production (not in local development)
DO $$
DECLARE
  is_local boolean;
BEGIN
  -- Check if we're in local development by looking for localhost in the config
  BEGIN
    is_local := current_setting('app.settings.supabase_url', true) LIKE '%localhost%' 
                OR current_setting('app.settings.supabase_url', true) LIKE '%127.0.0.1%'
                OR current_setting('app.settings.supabase_url', true) IS NULL;
  EXCEPTION
    WHEN OTHERS THEN
      -- If settings don't exist, assume local
      is_local := true;
  END;

  -- Only create the cron job if not local
  IF NOT is_local THEN
    -- Schedule the job to run every 5 minutes
    -- Uses the net extension to make HTTP calls to our edge function
    PERFORM cron.schedule(
      'process-scheduled-newsletters', -- job name
      '*/5 * * * *', -- every 5 minutes
      $job$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/process-newsletters',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('trigger', 'cron')
      );
      $job$
    );
    
    -- Log that the job was created
    RAISE NOTICE 'Newsletter processing cron job created successfully';
  ELSE
    -- Log that we skipped creation in local environment
    RAISE NOTICE 'Skipping cron job creation in local development environment';
  END IF;
END $$;
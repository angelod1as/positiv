-- Function to update segment counts cache
CREATE OR REPLACE FUNCTION update_newsletter_segment_counts()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  segment_count INTEGER;
BEGIN
  -- Update count for all subscribers
  SELECT COUNT(*)::INTEGER INTO segment_count
  FROM profiles 
  WHERE allow_marketing_email = true 
    AND email IS NOT NULL
    AND (approved_to_attend IS NULL OR approved_to_attend != 'rejected');
  
  UPDATE newsletter_segment_counts 
  SET count = segment_count, updated_at = NOW()
  WHERE segment_key = 'all';
  
  -- Update count for veterans
  SELECT COUNT(*)::INTEGER INTO segment_count
  FROM profiles 
  WHERE allow_marketing_email = true 
    AND email IS NOT NULL
    AND is_veteran = true
    AND (approved_to_attend IS NULL OR approved_to_attend != 'rejected');
  
  UPDATE newsletter_segment_counts 
  SET count = segment_count, updated_at = NOW()
  WHERE segment_key = 'veterans';
  
  -- Update count for newbies
  SELECT COUNT(*)::INTEGER INTO segment_count
  FROM profiles 
  WHERE allow_marketing_email = true 
    AND email IS NOT NULL
    AND is_veteran = false
    AND (approved_to_attend IS NULL OR approved_to_attend != 'rejected');
  
  UPDATE newsletter_segment_counts 
  SET count = segment_count, updated_at = NOW()
  WHERE segment_key = 'newbies';
  
  -- Update count for new registrations (last 30 days)
  SELECT COUNT(*)::INTEGER INTO segment_count
  FROM profiles 
  WHERE allow_marketing_email = true 
    AND email IS NOT NULL
    AND created_at >= NOW() - INTERVAL '30 days'
    AND (approved_to_attend IS NULL OR approved_to_attend != 'rejected');
  
  UPDATE newsletter_segment_counts 
  SET count = segment_count, updated_at = NOW()
  WHERE segment_key = 'new_registrations_30d';
  
  -- Update count for applied but never attended
  SELECT COUNT(DISTINCT p.id)::INTEGER INTO segment_count
  FROM profiles p
  LEFT JOIN event_participants ep_applied ON ep_applied.profile_id = p.id
  LEFT JOIN event_participants ep_attended ON ep_attended.profile_id = p.id 
    AND ep_attended.attendance_status = 'attended'
  WHERE p.allow_marketing_email = true 
    AND p.email IS NOT NULL
    AND ep_applied.id IS NOT NULL  -- Has applied to at least one event
    AND ep_attended.id IS NULL      -- Never attended any event
    AND (p.approved_to_attend IS NULL OR p.approved_to_attend != 'rejected');
  
  UPDATE newsletter_segment_counts 
  SET count = segment_count, updated_at = NOW()
  WHERE segment_key = 'applied_never_attended';
END;
$$;

-- Set up cron job to run daily at 2 AM
DO $$
BEGIN
  -- Only create cron job in production (pg_cron extension)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Check if job exists before trying to unschedule
    IF EXISTS (
      SELECT 1 FROM cron.job 
      WHERE jobname = 'update-newsletter-segment-counts'
    ) THEN
      PERFORM cron.unschedule('update-newsletter-segment-counts');
    END IF;
    
    -- Schedule new job to run daily at 2 AM
    PERFORM cron.schedule(
      'update-newsletter-segment-counts',
      '0 2 * * *',  -- Daily at 2 AM
      'SELECT update_newsletter_segment_counts();'
    );
  ELSE
    RAISE NOTICE 'Skipping cron job creation - pg_cron extension not available';
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'Skipping cron job creation in local development environment';
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipping cron job creation in local development environment';
END;
$$;

-- Run the function once to populate initial counts
SELECT update_newsletter_segment_counts();
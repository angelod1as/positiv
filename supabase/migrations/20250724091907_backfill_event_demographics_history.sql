-- Migration: Backfill event_demographics_history for already completed events

-- Create a temporary function to calculate and store demographics for completed events
CREATE OR REPLACE FUNCTION backfill_event_demographics()
RETURNS void AS $$
DECLARE
  event_record RECORD;
  participant_count INTEGER;
BEGIN
  -- Set search path
  SET search_path = public;

  -- Loop through all completed events that don't have demographics history
  FOR event_record IN 
    SELECT e.id
    FROM public.events e
    WHERE e.event_status = 'Completed'
      AND NOT EXISTS (
        SELECT 1 
        FROM public.event_demographics_history edh 
        WHERE edh.event_id = e.id
      )
  LOOP
    -- Count attended participants for this event
    SELECT COUNT(*) INTO participant_count
    FROM public.event_participants
    WHERE event_id = event_record.id
      AND attendance_status = 'attended';
    
    -- Only process if there are attended participants
    IF participant_count > 0 THEN
      -- Insert demographics snapshot
      INSERT INTO public.event_demographics_history (
        event_id,
        total,
        veteran_yes,
        veteran_no,
        gender_cis,
        gender_trans,
        gender_agender,
        gender_other_percentage,
        gender_other_values,
        orientation_straight,
        orientation_homo,
        orientation_bi_pan,
        orientation_ace_demi,
        orientation_other_percentage,
        orientation_other_values,
        age_average,
        age_min,
        age_max
      )
      SELECT
        event_record.id,
        COUNT(*) as total,
        -- Veteran percentages
        ROUND(COUNT(CASE WHEN p.is_veteran = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as veteran_yes,
        ROUND(COUNT(CASE WHEN p.is_veteran = false THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as veteran_no,
        -- Gender percentages (simplified for backfill)
        ROUND(COUNT(CASE WHEN p.gender @> ARRAY['Cis Woman']::text[] OR p.gender @> ARRAY['Cis Man']::text[] THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as gender_cis,
        ROUND(COUNT(CASE WHEN p.gender @> ARRAY['Trans Woman']::text[] OR p.gender @> ARRAY['Trans Man']::text[] THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as gender_trans,
        ROUND(COUNT(CASE WHEN p.gender @> ARRAY['Agender']::text[] THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as gender_agender,
        0 as gender_other_percentage, -- Simplified for backfill
        ARRAY[]::text[] as gender_other_values,
        -- Orientation percentages (simplified for backfill)
        ROUND(COUNT(CASE WHEN p.orientation @> ARRAY['Straight']::text[] THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as orientation_straight,
        ROUND(COUNT(CASE WHEN p.orientation @> ARRAY['Gay']::text[] OR p.orientation @> ARRAY['Lesbian']::text[] THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as orientation_homo,
        ROUND(COUNT(CASE WHEN p.orientation @> ARRAY['Bi']::text[] OR p.orientation @> ARRAY['Pan']::text[] THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as orientation_bi_pan,
        ROUND(COUNT(CASE WHEN p.orientation @> ARRAY['Ace']::text[] OR p.orientation @> ARRAY['Demi']::text[] THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as orientation_ace_demi,
        0 as orientation_other_percentage, -- Simplified for backfill
        ARRAY[]::text[] as orientation_other_values,
        -- Age statistics
        ROUND(AVG(EXTRACT(YEAR FROM AGE(p.date_of_birth)))::numeric, 2) as age_average,
        MIN(EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer) as age_min,
        MAX(EXTRACT(YEAR FROM AGE(p.date_of_birth))::integer) as age_max
      FROM public.event_participants ep
      INNER JOIN public.profiles p ON p.id = ep.profile_id
      WHERE ep.event_id = event_record.id
        AND ep.attendance_status = 'attended';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the owner of the function
ALTER FUNCTION public.backfill_event_demographics() OWNER TO postgres;

-- Execute the backfill
SELECT backfill_event_demographics();

-- Drop the temporary function
DROP FUNCTION public.backfill_event_demographics();

-- Add comment about the backfill
COMMENT ON TABLE public.event_demographics_history
IS 'Stores historical snapshots of event demographics calculated when events are completed. Backfilled on 2025-07-24 for previously completed events.';
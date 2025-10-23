-- Migration: Remove all newsletter functionality
-- This migration removes all newsletter-related database objects

-- Step 1: Unschedule cron jobs
DO $$
BEGIN
  -- Unschedule newsletter processing cron job
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'process-scheduled-newsletters'
  ) THEN
    PERFORM cron.unschedule('process-scheduled-newsletters');
    RAISE NOTICE 'Unscheduled cron job: process-scheduled-newsletters';
  END IF;

  -- Unschedule newsletter segment counts update cron job
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'update-newsletter-segment-counts'
  ) THEN
    PERFORM cron.unschedule('update-newsletter-segment-counts');
    RAISE NOTICE 'Unscheduled cron job: update-newsletter-segment-counts';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Cron jobs table not found - skipping cron job cleanup';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error unscheduling cron jobs: %', SQLERRM;
END $$;

-- Step 2: Drop function
DROP FUNCTION IF EXISTS update_newsletter_segment_counts();

-- Step 3: Drop tables (in dependency order)
-- Drop tables that reference newsletters first
DROP TABLE IF EXISTS public.newsletter_queue CASCADE;
DROP TABLE IF EXISTS public.newsletter_sends CASCADE;
DROP TABLE IF EXISTS public.unsubscribe_logs CASCADE;

-- Drop the main newsletters table
DROP TABLE IF EXISTS public.newsletters CASCADE;

-- Drop the segment counts cache table
DROP TABLE IF EXISTS public.newsletter_segment_counts CASCADE;

-- Step 4: Drop pg_net extension (only used for newsletters)
-- pg_cron is kept because it's used by event scheduling
DROP EXTENSION IF EXISTS pg_net;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully removed all newsletter functionality';
END $$;

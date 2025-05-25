-- Migration: Fix events anon policies
-- This migration fixes the multiple permissive policies issue for the anon role on the events table

-- Drop the existing policies for anon
DROP POLICY IF EXISTS combined_anon_select_events ON public.events;
DROP POLICY IF EXISTS combined_anon_all_other_events ON public.events;

-- Create a single policy for SELECT
CREATE POLICY combined_anon_select_events
ON public.events FOR SELECT
TO anon
USING (event_status IN ('Registration Open', 'Scheduled'));

-- Create separate policies for other operations (INSERT, UPDATE, DELETE)
CREATE POLICY combined_anon_insert_events_deny
ON public.events FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY combined_anon_update_events_deny
ON public.events FOR UPDATE
TO anon
USING (false) WITH CHECK (false);

CREATE POLICY combined_anon_delete_events_deny
ON public.events FOR DELETE
TO anon
USING (false);

-- Add comments for the new policies
COMMENT ON POLICY combined_anon_select_events ON public.events IS 'Allow anonymous users to select events with specific statuses.';
COMMENT ON POLICY combined_anon_insert_events_deny ON public.events IS 'Deny anonymous users insert access to events.';
COMMENT ON POLICY combined_anon_update_events_deny ON public.events IS 'Deny anonymous users update access to events.';
COMMENT ON POLICY combined_anon_delete_events_deny ON public.events IS 'Deny anonymous users delete access to events.';

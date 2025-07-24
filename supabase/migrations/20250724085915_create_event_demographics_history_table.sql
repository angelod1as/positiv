-- Migration: Create event_demographics_history table to store historical demographics snapshots

-- Create event_demographics_history table
CREATE TABLE public.event_demographics_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  calculated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Total attendees
  total integer NOT NULL DEFAULT 0,
  
  -- Veteran status counts (percentages)
  veteran_yes numeric(5,2) NOT NULL DEFAULT 0,
  veteran_no numeric(5,2) NOT NULL DEFAULT 0,
  
  -- Gender counts (percentages)
  gender_cis numeric(5,2) NOT NULL DEFAULT 0,
  gender_trans numeric(5,2) NOT NULL DEFAULT 0,
  gender_agender numeric(5,2) NOT NULL DEFAULT 0,
  gender_other_percentage numeric(5,2) NOT NULL DEFAULT 0,
  gender_other_values text[] DEFAULT '{}',
  
  -- Orientation counts (percentages)
  orientation_straight numeric(5,2) NOT NULL DEFAULT 0,
  orientation_homo numeric(5,2) NOT NULL DEFAULT 0,
  orientation_bi_pan numeric(5,2) NOT NULL DEFAULT 0,
  orientation_ace_demi numeric(5,2) NOT NULL DEFAULT 0,
  orientation_other_percentage numeric(5,2) NOT NULL DEFAULT 0,
  orientation_other_values text[] DEFAULT '{}',
  
  -- Age statistics
  age_average numeric(5,2),
  age_min integer,
  age_max integer,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for event_id to speed up lookups
CREATE INDEX idx_event_demographics_history_event_id ON public.event_demographics_history(event_id);

-- Create index for calculated_at to support ordering
CREATE INDEX idx_event_demographics_history_calculated_at ON public.event_demographics_history(calculated_at DESC);

-- Add RLS policies
ALTER TABLE public.event_demographics_history ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to event_demographics_history"
  ON public.event_demographics_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow admins to read demographics history
CREATE POLICY "Admins can read event_demographics_history"
  ON public.event_demographics_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Add comment to the table
COMMENT ON TABLE public.event_demographics_history
IS 'Stores historical snapshots of event demographics calculated when events are completed';

-- Grant permissions
GRANT SELECT ON public.event_demographics_history TO authenticated;
GRANT ALL ON public.event_demographics_history TO service_role;
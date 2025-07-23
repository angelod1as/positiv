-- Create enum type for event types
CREATE TYPE public.event_type AS ENUM ('regular', 'bdsm');

-- Add event_type column to events table
ALTER TABLE public.events 
ADD COLUMN event_type public.event_type NOT NULL DEFAULT 'regular';

-- Add comment for the new column
COMMENT ON COLUMN public.events.event_type IS 'The type of event: regular (default) or bdsm. BDSM events require an additional consent page.';
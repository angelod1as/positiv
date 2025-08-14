-- Migration: Add performance tracking fields to newsletters table

-- Add columns for tracking send duration and performance
ALTER TABLE public.newsletters 
ADD COLUMN IF NOT EXISTS send_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS send_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_recipients INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_sends INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_sends INT DEFAULT 0;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_newsletters_send_started_at 
ON public.newsletters(send_started_at) 
WHERE send_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_newsletters_send_completed_at 
ON public.newsletters(send_completed_at) 
WHERE send_completed_at IS NOT NULL;

-- Add comments to new columns
COMMENT ON COLUMN public.newsletters.send_started_at 
IS 'Timestamp when the newsletter sending process started';

COMMENT ON COLUMN public.newsletters.send_completed_at 
IS 'Timestamp when the newsletter sending process completed';

COMMENT ON COLUMN public.newsletters.total_recipients 
IS 'Total number of recipients who were queued to receive the newsletter';

COMMENT ON COLUMN public.newsletters.successful_sends 
IS 'Number of successfully sent emails';

COMMENT ON COLUMN public.newsletters.failed_sends 
IS 'Number of failed email sends';
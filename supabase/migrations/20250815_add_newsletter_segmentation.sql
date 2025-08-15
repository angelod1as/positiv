-- Migration: Add segmentation capabilities to newsletters
-- This adds support for audience segmentation in email marketing

-- Add segment_filter column to store the selected segment configuration
ALTER TABLE public.newsletters 
ADD COLUMN IF NOT EXISTS segment_filter JSONB,
ADD COLUMN IF NOT EXISTS exclude_rejected BOOLEAN NOT NULL DEFAULT true;

-- Add comment to explain the columns
COMMENT ON COLUMN public.newsletters.segment_filter 
IS 'JSON configuration for audience segmentation filters including veteransOnly, newbiesOnly, activityType, registeredWithinDays, etc.';

COMMENT ON COLUMN public.newsletters.exclude_rejected
IS 'When true, excludes profiles with attendance_status = rejected from receiving the newsletter. Defaults to true for safety.';

-- Create index for better query performance when filtering newsletters by segment
CREATE INDEX IF NOT EXISTS idx_newsletters_segment_filter 
ON public.newsletters USING GIN (segment_filter) 
WHERE segment_filter IS NOT NULL;

-- Add recipient_count column to track expected recipients at send time
ALTER TABLE public.newsletters
ADD COLUMN IF NOT EXISTS expected_recipient_count INTEGER;

COMMENT ON COLUMN public.newsletters.expected_recipient_count
IS 'The number of recipients that matched the segment filter at the time of sending. Used for analytics and tracking.';
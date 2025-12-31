-- Add updated_at column to event_participants for staleness detection
ALTER TABLE public.event_participants
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

COMMENT ON COLUMN public.event_participants.updated_at IS 'Timestamp when this participation record was last updated. Used for detecting if Listmonk list needs to be re-synced.';

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_event_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to call the function before any update
CREATE TRIGGER event_participants_updated_at_trigger
BEFORE UPDATE ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_event_participants_updated_at();

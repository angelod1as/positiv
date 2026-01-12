-- Migration: Add was_selected_for_rotation field to event_participants
-- This field permanently tracks if a participant was selected for rotation (rodízio)
-- Once set to true, it never goes back to false (even if attendance_status changes)

BEGIN;

-- Step 1: Add the new column with default value false
ALTER TABLE public.event_participants
ADD COLUMN was_selected_for_rotation boolean NOT NULL DEFAULT false;

-- Step 2: Create the trigger function
CREATE OR REPLACE FUNCTION public.set_selected_for_rotation()
RETURNS trigger AS $$
BEGIN
  SET search_path = public;

  -- Only set to true when attendance_status is 'skipped'
  -- Never set it back to false (once selected, always marked)
  IF NEW.attendance_status = 'skipped' AND NEW.was_selected_for_rotation = false THEN
    NEW.was_selected_for_rotation := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set function owner
ALTER FUNCTION public.set_selected_for_rotation() OWNER TO postgres;

-- Step 3: Create the trigger (BEFORE to allow modification of NEW)
CREATE TRIGGER set_selected_for_rotation_trigger
BEFORE INSERT OR UPDATE ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.set_selected_for_rotation();

-- Step 4: Grant permissions
GRANT ALL ON FUNCTION public.set_selected_for_rotation() TO service_role;
REVOKE ALL ON FUNCTION public.set_selected_for_rotation() FROM anon, authenticated;

-- Step 5: Backfill existing data
UPDATE public.event_participants
SET was_selected_for_rotation = true
WHERE attendance_status = 'skipped';

COMMIT;

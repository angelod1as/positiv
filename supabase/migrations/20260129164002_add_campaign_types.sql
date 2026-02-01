-- Migration: Add campaign_type and should_send_at to event_newsletter_campaigns
-- Part 1: Schema changes

-- 1. Remove old UNIQUE constraint on event_id
ALTER TABLE event_newsletter_campaigns
  DROP CONSTRAINT IF EXISTS event_newsletter_campaigns_event_id_key;

-- 2. Add campaign_type enum
DO $$ BEGIN
  CREATE TYPE campaign_type AS ENUM ('opening', 'pre_opening');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE event_newsletter_campaigns
  ADD COLUMN IF NOT EXISTS campaign_type campaign_type NOT NULL DEFAULT 'opening';

-- 3. Add should_send_at column
ALTER TABLE event_newsletter_campaigns
  ADD COLUMN IF NOT EXISTS should_send_at timestamptz;

-- 4. Add composite UNIQUE constraint
DO $$ BEGIN
  ALTER TABLE event_newsletter_campaigns
    ADD CONSTRAINT event_newsletter_campaigns_event_id_type_key
    UNIQUE (event_id, campaign_type);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Create optimized index
CREATE INDEX IF NOT EXISTS idx_event_newsletter_campaigns_pending_v2
ON event_newsletter_campaigns(
  campaign_type,
  should_send_at,
  campaign_is_created,
  campaign_is_sent,
  times_attempted
);

-- 6. Populate should_send_at for existing 'opening' campaigns
-- Note: We only backfill 'opening' campaigns here. Pre-opening campaigns
-- (which send 3 days before registration opens) are intentionally NOT backfilled
-- for existing events - they will only be created for new/updated future events
-- via the trigger function below.
UPDATE event_newsletter_campaigns enc
SET should_send_at = e.time_application_start
FROM events e
WHERE enc.event_id = e.id
  AND enc.campaign_type = 'opening'
  AND enc.should_send_at IS NULL;

-- Part 2: Trigger function for automatic campaign population

-- Trigger function to auto-create campaigns
CREATE OR REPLACE FUNCTION create_event_campaigns()
RETURNS TRIGGER AS $func$
BEGIN
  -- Skip if time_application_start didn't change (optimization for UPDATE)
  IF TG_OP = 'UPDATE' AND OLD.time_application_start IS NOT DISTINCT FROM NEW.time_application_start THEN
    RETURN NEW;
  END IF;

  -- Only if time_application_start is in the future
  IF NEW.time_application_start > NOW() THEN

    -- Pre-opening campaign (3 days before)
    INSERT INTO event_newsletter_campaigns (
      event_id,
      campaign_type,
      should_send_at,
      campaign_is_created,
      campaign_is_sent,
      times_attempted
    ) VALUES (
      NEW.id,
      'pre_opening',
      NEW.time_application_start - INTERVAL '3 days',
      false,
      false,
      0
    )
    ON CONFLICT (event_id, campaign_type)
    DO UPDATE SET
      should_send_at = NEW.time_application_start - INTERVAL '3 days',
      updated_at = NOW();

    -- Opening campaign (at application start time)
    INSERT INTO event_newsletter_campaigns (
      event_id,
      campaign_type,
      should_send_at,
      campaign_is_created,
      campaign_is_sent,
      times_attempted
    ) VALUES (
      NEW.id,
      'opening',
      NEW.time_application_start,
      false,
      false,
      0
    )
    ON CONFLICT (event_id, campaign_type)
    DO UPDATE SET
      should_send_at = NEW.time_application_start,
      updated_at = NOW();

  ELSE
    -- If event moved to the past, mark campaigns as sent to prevent orphaned records
    UPDATE event_newsletter_campaigns
    SET
      campaign_is_sent = true,
      campaign_sent_time = COALESCE(campaign_sent_time, NOW()),
      updated_at = NOW()
    WHERE event_id = NEW.id
      AND campaign_is_sent = false;

  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Attach trigger to events table
-- Only fires on INSERT or when time_application_start changes
-- Additional optimization inside function skips unchanged updates
DROP TRIGGER IF EXISTS trigger_create_event_campaigns ON events;
CREATE TRIGGER trigger_create_event_campaigns
AFTER INSERT OR UPDATE OF time_application_start ON events
FOR EACH ROW
EXECUTE FUNCTION create_event_campaigns();

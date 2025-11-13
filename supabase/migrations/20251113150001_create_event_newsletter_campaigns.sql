-- Create event_newsletter_campaigns table for automated newsletter campaign tracking
-- Part of newsletter automation system that replaces manual reminder emails

CREATE TABLE IF NOT EXISTS event_newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  campaign_is_created boolean NOT NULL DEFAULT false,
  campaign_creation_time timestamptz,
  campaign_id text,
  campaign_is_sent boolean NOT NULL DEFAULT false,
  campaign_sent_time timestamptz,
  last_attempt timestamptz,
  times_attempted integer NOT NULL DEFAULT 0,
  last_error jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying pending campaigns
CREATE INDEX IF NOT EXISTS idx_event_newsletter_campaigns_pending
ON event_newsletter_campaigns(campaign_is_created, campaign_is_sent, times_attempted);

-- Index for event lookups
CREATE INDEX IF NOT EXISTS idx_event_newsletter_campaigns_event_id
ON event_newsletter_campaigns(event_id);

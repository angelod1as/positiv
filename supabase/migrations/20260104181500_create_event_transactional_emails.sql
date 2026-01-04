-- Create event_transactional_emails table for tracking automated transactional emails
-- This table is generic and can handle multiple email types (group_closing, payment_reminder, etc.)
-- Part of POS-314: Email transacional no dia da abertura do grupo

CREATE TABLE IF NOT EXISTS event_transactional_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email_type text NOT NULL CHECK (email_type IN ('group_closing')),
  emails_sent boolean NOT NULL DEFAULT false,
  sent_time timestamptz,
  recipient_count integer,
  last_attempt timestamptz,
  times_attempted integer NOT NULL DEFAULT 0,
  last_error jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(event_id, email_type)
);

-- Index for querying pending emails by type
CREATE INDEX IF NOT EXISTS idx_event_transactional_emails_pending
  ON event_transactional_emails(email_type, emails_sent, times_attempted);

-- Index for event lookups
CREATE INDEX IF NOT EXISTS idx_event_transactional_emails_event_id
  ON event_transactional_emails(event_id);

-- Table and column comments for documentation
COMMENT ON TABLE event_transactional_emails IS
  'Tracks all automated transactional emails sent for events (group_closing, payment_reminder, etc.). Generic table that can be extended with new email types by updating the CHECK constraint.';

COMMENT ON COLUMN event_transactional_emails.email_type IS
  'Type of transactional email. Current types: group_closing. Add new types to CHECK constraint as needed.';

COMMENT ON COLUMN event_transactional_emails.emails_sent IS
  'Boolean flag indicating if emails were successfully sent for this event/type combination.';

COMMENT ON COLUMN event_transactional_emails.recipient_count IS
  'Number of recipients who received the email. Useful for tracking and analytics.';

COMMENT ON COLUMN event_transactional_emails.times_attempted IS
  'Number of times we attempted to send this email. Maximum is 3 attempts before giving up.';

COMMENT ON COLUMN event_transactional_emails.last_error IS
  'JSONB field storing error details from the last failed attempt. Useful for debugging.';

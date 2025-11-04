-- Add first and last consent timestamps for better audit trail
-- first_consent_given_at: When user FIRST gave consent (immutable)
-- last_consent_given_at: When user MOST RECENTLY gave consent (updates on resubscribe)

-- Add new column for first consent timestamp
ALTER TABLE newsletter_subscriptions
  ADD COLUMN first_consent_given_at timestamptz;

-- Backfill from existing consent_given_at
UPDATE newsletter_subscriptions
  SET first_consent_given_at = consent_given_at;

-- Rename existing consent_given_at to last_consent_given_at
ALTER TABLE newsletter_subscriptions
  RENAME COLUMN consent_given_at TO last_consent_given_at;

-- Update column comments for clarity
COMMENT ON COLUMN newsletter_subscriptions.first_consent_given_at IS
  'When the user first gave consent to receive marketing emails (immutable, never changes after initial consent)';

COMMENT ON COLUMN newsletter_subscriptions.last_consent_given_at IS
  'When the user most recently gave consent (updates on each resubscription)';

COMMENT ON COLUMN newsletter_subscriptions.subscribed_at IS
  'When the user actively subscribed (may be different from consent timestamps)';

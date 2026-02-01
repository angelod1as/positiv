-- Part 1/2: Schema changes for retry tracking (must run before cron setup in Part 2)
-- Add retry tracking to newsletter_subscriptions table for failed sync retries
-- Part of POS-262: Add cron job to retry failed newsletter syncs to Listmonk

-- Add retry_count column to track number of retry attempts
ALTER TABLE newsletter_subscriptions
ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

-- Add check constraint to ensure retry_count is never negative
ALTER TABLE newsletter_subscriptions
ADD CONSTRAINT check_retry_count_non_negative CHECK (retry_count >= 0);

-- Add composite index for efficient query of failed syncs that need retry
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_failed_retry
ON newsletter_subscriptions(sync_status, retry_count)
WHERE sync_status = 'failed';

-- Backfill existing records with retry_count = 0 (should already be default, but being explicit)
UPDATE newsletter_subscriptions
SET retry_count = 0
WHERE retry_count IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN newsletter_subscriptions.retry_count IS 'Number of retry attempts for failed Listmonk syncs. Max retries = 5. Automatically managed by retry-failed-newsletter-syncs cron job.';

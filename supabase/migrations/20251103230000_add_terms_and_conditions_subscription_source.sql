-- Add 'terms_and_conditions' to subscription_source check constraint
-- This allows tracking when users manually change preferences via the terms page

-- Drop the old constraint
ALTER TABLE newsletter_subscriptions
  DROP CONSTRAINT IF EXISTS newsletter_subscriptions_subscription_source_check;

-- Add the new constraint with 'terms_and_conditions'
ALTER TABLE newsletter_subscriptions
  ADD CONSTRAINT newsletter_subscriptions_subscription_source_check
  CHECK (subscription_source IN ('onboarding_auto', 'terms_and_conditions', 'manual_button', 'backfill', 'admin'));

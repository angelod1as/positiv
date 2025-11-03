-- Create newsletter_subscriptions table to replace allow_marketing_email
-- This provides better tracking, audit trail, and Listmonk integration

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  consent_given boolean NOT NULL DEFAULT false,
  consent_given_at timestamptz,
  subscribed_at timestamptz,
  unsubscribed_at timestamptz,
  subscription_source text CHECK (subscription_source IN ('onboarding_auto', 'manual_button', 'backfill', 'admin')),
  listmonk_subscriber_id integer,
  sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'unsubscribed')),
  last_sync_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_profile_id ON newsletter_subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_sync_status ON newsletter_subscriptions(sync_status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_consent_given ON newsletter_subscriptions(consent_given);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_listmonk_id ON newsletter_subscriptions(listmonk_subscriber_id) WHERE listmonk_subscriber_id IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_newsletter_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
CREATE TRIGGER update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON newsletter_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_subscriptions_updated_at();

-- Enable RLS
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own subscription status
CREATE POLICY "Users can view own newsletter subscription"
  ON newsletter_subscriptions
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can update their own subscription status
CREATE POLICY "Users can update own newsletter subscription"
  ON newsletter_subscriptions
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Admins have full access to all subscriptions
CREATE POLICY "Admins have full access to newsletter subscriptions"
  ON newsletter_subscriptions
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles
      WHERE role_name = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_roles
      WHERE role_name = 'admin'
    )
  );

-- Migrate existing data from allow_marketing_email
-- Migrate all profiles where allow_marketing_email is set (true or false)
-- This preserves the audit trail of who explicitly declined
INSERT INTO newsletter_subscriptions (
  profile_id,
  consent_given,
  consent_given_at,
  subscribed_at,
  unsubscribed_at,
  subscription_source,
  sync_status,
  created_at,
  updated_at
)
SELECT
  id as profile_id,
  allow_marketing_email as consent_given,
  -- Use created_at as a proxy for when consent was given
  created_at as consent_given_at,
  -- Only set subscribed_at if they actually subscribed
  CASE
    WHEN allow_marketing_email = true THEN created_at
    ELSE NULL
  END as subscribed_at,
  -- Set unsubscribed_at if they declined
  CASE
    WHEN allow_marketing_email = false THEN created_at
    ELSE NULL
  END as unsubscribed_at,
  'backfill' as subscription_source,
  -- Set appropriate sync status
  CASE
    WHEN allow_marketing_email = true THEN 'pending'
    ELSE 'unsubscribed'
  END as sync_status,
  now() as created_at,
  now() as updated_at
FROM profiles
WHERE allow_marketing_email IS NOT NULL
ON CONFLICT (profile_id) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE newsletter_subscriptions IS 'Tracks newsletter subscription status and Listmonk sync state for user profiles';
COMMENT ON COLUMN newsletter_subscriptions.profile_id IS 'Reference to the profile that owns this subscription';
COMMENT ON COLUMN newsletter_subscriptions.consent_given IS 'Whether the user has given consent to receive marketing emails';
COMMENT ON COLUMN newsletter_subscriptions.consent_given_at IS 'When the user first gave consent';
COMMENT ON COLUMN newsletter_subscriptions.subscribed_at IS 'When the user actively subscribed (may be different from consent_given_at)';
COMMENT ON COLUMN newsletter_subscriptions.unsubscribed_at IS 'When the user unsubscribed (if applicable)';
COMMENT ON COLUMN newsletter_subscriptions.subscription_source IS 'How the subscription was created: onboarding_auto, manual_button, backfill, or admin';
COMMENT ON COLUMN newsletter_subscriptions.listmonk_subscriber_id IS 'The subscriber ID in Listmonk (external system)';
COMMENT ON COLUMN newsletter_subscriptions.sync_status IS 'Current sync status with Listmonk: pending, synced, failed, or unsubscribed';
COMMENT ON COLUMN newsletter_subscriptions.last_sync_attempt_at IS 'Timestamp of the last attempt to sync with Listmonk';

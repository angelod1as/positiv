-- Fix RLS policies for newsletter_subscriptions
-- The policies were incorrectly comparing auth.uid() with profile_id (a UUID),
-- but should compare with profiles.user_id instead

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own newsletter subscription" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update own newsletter subscription" ON newsletter_subscriptions;

-- Recreate with correct user_id comparison
CREATE POLICY "Users can view own newsletter subscription"
  ON newsletter_subscriptions
  FOR SELECT
  USING (
    (
      SELECT p.user_id
      FROM profiles p
      WHERE p.id = newsletter_subscriptions.profile_id
    ) = auth.uid()
  );

CREATE POLICY "Users can update own newsletter subscription"
  ON newsletter_subscriptions
  FOR UPDATE
  USING (
    (
      SELECT p.user_id
      FROM profiles p
      WHERE p.id = newsletter_subscriptions.profile_id
    ) = auth.uid()
  )
  WITH CHECK (
    (
      SELECT p.user_id
      FROM profiles p
      WHERE p.id = newsletter_subscriptions.profile_id
    ) = auth.uid()
  );

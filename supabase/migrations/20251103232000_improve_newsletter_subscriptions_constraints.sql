-- Improve newsletter_subscriptions constraints and policies

-- 1. Add UNIQUE constraint to listmonk_subscriber_id
-- This ensures one-to-one mapping with Listmonk and prevents duplicate syncs
ALTER TABLE newsletter_subscriptions
  ADD CONSTRAINT newsletter_subscriptions_listmonk_subscriber_id_unique
  UNIQUE (listmonk_subscriber_id);

-- 2. Improve admin RLS policy to use EXISTS pattern
DROP POLICY IF EXISTS "Admins have full access to newsletter subscriptions" ON newsletter_subscriptions;

CREATE POLICY "Admins have full access to newsletter subscriptions"
  ON newsletter_subscriptions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role_name = 'admin'
    )
  );

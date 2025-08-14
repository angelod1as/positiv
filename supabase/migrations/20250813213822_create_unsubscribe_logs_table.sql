-- Create unsubscribe_logs table for compliance tracking
CREATE TABLE IF NOT EXISTS unsubscribe_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'email_link', -- email_link, admin_action, api, etc.
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for query performance
CREATE INDEX idx_unsubscribe_logs_profile_id ON unsubscribe_logs(profile_id);
CREATE INDEX idx_unsubscribe_logs_unsubscribed_at ON unsubscribe_logs(unsubscribed_at DESC);

-- Enable RLS
ALTER TABLE unsubscribe_logs ENABLE ROW LEVEL SECURITY;

-- Admin users can view all unsubscribe logs
CREATE POLICY "Admin users can view unsubscribe logs"
  ON unsubscribe_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_name = 'admin'
    )
  );

-- Admin users can insert unsubscribe logs
CREATE POLICY "Admin users can insert unsubscribe logs"
  ON unsubscribe_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_name = 'admin'
    )
  );

-- Service role can do everything
CREATE POLICY "Service role can manage unsubscribe logs"
  ON unsubscribe_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow public inserts for unsubscribe logging from the public endpoint
-- This is needed because the unsubscribe endpoint runs without authentication
CREATE POLICY "Allow public insert for unsubscribe logging"
  ON unsubscribe_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (source = 'email_link');
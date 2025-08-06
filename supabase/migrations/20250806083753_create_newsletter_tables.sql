-- Migration: Create newsletter tables for email marketing system

-- Create newsletters table
CREATE TABLE public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,
  content_mdx TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create newsletter_sends table to track individual sends
CREATE TABLE public.newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  UNIQUE(newsletter_id, profile_id)
);

-- Create newsletter_queue table for processing
CREATE TABLE public.newsletter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_newsletters_status ON public.newsletters(status);
CREATE INDEX idx_newsletters_scheduled_at ON public.newsletters(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_newsletters_created_by ON public.newsletters(created_by);

CREATE INDEX idx_newsletter_sends_newsletter_id ON public.newsletter_sends(newsletter_id);
CREATE INDEX idx_newsletter_sends_profile_id ON public.newsletter_sends(profile_id);
CREATE INDEX idx_newsletter_sends_status ON public.newsletter_sends(status);

CREATE INDEX idx_newsletter_queue_newsletter_id ON public.newsletter_queue(newsletter_id);
CREATE INDEX idx_newsletter_queue_profile_id ON public.newsletter_queue(profile_id);
CREATE INDEX idx_newsletter_queue_status_created_at ON public.newsletter_queue(status, created_at) WHERE status IN ('pending', 'processing', 'failed');

-- Enable RLS on all tables
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_queue ENABLE ROW LEVEL SECURITY;

-- Service role has full access to all newsletter tables
CREATE POLICY "Service role has full access to newsletters"
  ON public.newsletters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to newsletter_sends"
  ON public.newsletter_sends
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to newsletter_queue"
  ON public.newsletter_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin users can read and write newsletters
CREATE POLICY "Admins can read newsletters"
  ON public.newsletters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  );

CREATE POLICY "Admins can insert newsletters"
  ON public.newsletters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  );

CREATE POLICY "Admins can update newsletters"
  ON public.newsletters
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  );

CREATE POLICY "Admins can delete newsletters"
  ON public.newsletters
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  );

-- Admin users can read newsletter_sends
CREATE POLICY "Admins can read newsletter_sends"
  ON public.newsletter_sends
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  );

-- Admin users can read newsletter_queue
CREATE POLICY "Admins can read newsletter_queue"
  ON public.newsletter_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  );

-- Add comments to tables
COMMENT ON TABLE public.newsletters
IS 'Stores newsletter templates and content for email marketing campaigns';

COMMENT ON TABLE public.newsletter_sends
IS 'Tracks individual newsletter sends to profiles with delivery status';

COMMENT ON TABLE public.newsletter_queue
IS 'Queue for processing newsletter sends with retry logic';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletters TO authenticated;
GRANT SELECT ON public.newsletter_sends TO authenticated;
GRANT SELECT ON public.newsletter_queue TO authenticated;
GRANT ALL ON public.newsletters TO service_role;
GRANT ALL ON public.newsletter_sends TO service_role;
GRANT ALL ON public.newsletter_queue TO service_role;
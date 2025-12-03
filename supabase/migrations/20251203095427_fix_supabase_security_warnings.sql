-- Migration: Fix Supabase security and performance warnings
-- Addresses:
-- 1. RLS not enabled on event_newsletter_campaigns (ERROR)
-- 2. Mutable search_path on 8 functions (WARNINGS)
-- 3. Extensions in public schema instead of extensions (WARNINGS)
-- 4. Auth RLS initplan - auth.uid() re-evaluated per row (PERFORMANCE)
-- 5. Multiple permissive policies on newsletter_subscriptions (PERFORMANCE)

-- ============================================================================
-- PART 1: Enable RLS on event_newsletter_campaigns table
-- ============================================================================

-- Enable RLS (this is the critical ERROR fix)
ALTER TABLE public.event_newsletter_campaigns ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to event_newsletter_campaigns"
  ON public.event_newsletter_campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin users can SELECT event newsletter campaigns
CREATE POLICY "Admins can read event_newsletter_campaigns"
  ON public.event_newsletter_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  );

-- Admin users can INSERT event newsletter campaigns
CREATE POLICY "Admins can insert event_newsletter_campaigns"
  ON public.event_newsletter_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  );

-- Admin users can UPDATE event newsletter campaigns
CREATE POLICY "Admins can update event_newsletter_campaigns"
  ON public.event_newsletter_campaigns
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

-- Admin users can DELETE event newsletter campaigns
CREATE POLICY "Admins can delete event_newsletter_campaigns"
  ON public.event_newsletter_campaigns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_name = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_newsletter_campaigns TO authenticated;
GRANT ALL ON public.event_newsletter_campaigns TO service_role;

-- Add table comment
COMMENT ON TABLE public.event_newsletter_campaigns IS 'Tracks automated newsletter campaign creation and sending for events. Admin and service role access only.';

-- ============================================================================
-- PART 2: Fix mutable search_path warnings on functions
-- ============================================================================
-- Supabase requires search_path = '' (empty string) for security

-- Fix ALL 8 functions with mutable search_path
ALTER FUNCTION public.add_user_role(uuid, text) SET search_path = '';
ALTER FUNCTION public.update_profile_email() SET search_path = '';
ALTER FUNCTION public.get_admin_user_ids() SET search_path = '';
ALTER FUNCTION public.update_newsletter_subscriptions_updated_at() SET search_path = '';
ALTER FUNCTION public.update_event_statuses_automatically() SET search_path = '';
ALTER FUNCTION public.get_vault_secret(text) SET search_path = '';
ALTER FUNCTION public.update_veteran_status() SET search_path = '';
ALTER FUNCTION public.get_profile_with_roles(uuid) SET search_path = '';

-- ============================================================================
-- PART 3: Move extensions from public to extensions schema
-- ============================================================================

-- First ensure extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension
DO $$
BEGIN
  -- Check if extension exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension
    WHERE extname = 'pg_net'
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Drop from public
    DROP EXTENSION IF EXISTS pg_net CASCADE;
  END IF;

  -- Create in extensions schema
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
END $$;

-- Move http extension
DO $$
BEGIN
  -- Check if extension exists in public schema
  IF EXISTS (
    SELECT 1 FROM pg_extension
    WHERE extname = 'http'
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Drop from public (CASCADE handles dependent types)
    DROP EXTENSION IF EXISTS http CASCADE;
  END IF;

  -- Create in extensions schema
  CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
END $$;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres;
GRANT USAGE ON SCHEMA extensions TO service_role;

-- Ensure net schema grants are correct (pg_net creates 'net' schema)
GRANT USAGE ON SCHEMA net TO postgres;
GRANT USAGE ON SCHEMA net TO service_role;

-- Add comments
COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions to avoid cluttering public schema';

-- ============================================================================
-- PART 4: Optimize RLS policies for performance
-- ============================================================================
-- Fix auth.uid() calls to use (select auth.uid()) to avoid re-evaluation per row
-- Fix multiple permissive policies on newsletter_subscriptions

-- ----------------------------------------------------------------------------
-- 4.1: Fix event_demographics_history policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can read event_demographics_history" ON public.event_demographics_history;

CREATE POLICY "Admins can read event_demographics_history"
  ON public.event_demographics_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role_name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- 4.2: Fix newsletter_subscriptions policies
-- ----------------------------------------------------------------------------
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins have full access to newsletter subscriptions" ON public.newsletter_subscriptions;

-- Recreate user policies with optimized auth.uid()
CREATE POLICY "Users can view own newsletter subscription"
  ON public.newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    (
      SELECT p.user_id
      FROM profiles p
      WHERE p.id = newsletter_subscriptions.profile_id
    ) = (select auth.uid())
  );

CREATE POLICY "Users can update own newsletter subscription"
  ON public.newsletter_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT p.user_id
      FROM profiles p
      WHERE p.id = newsletter_subscriptions.profile_id
    ) = (select auth.uid())
  )
  WITH CHECK (
    (
      SELECT p.user_id
      FROM profiles p
      WHERE p.id = newsletter_subscriptions.profile_id
    ) = (select auth.uid())
  );

-- Split admin policy into specific actions to avoid multiple permissive policies
CREATE POLICY "Admins can insert newsletter subscriptions"
  ON public.newsletter_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
        AND ur.role_name = 'admin'
    )
  );

CREATE POLICY "Admins can select newsletter subscriptions"
  ON public.newsletter_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
        AND ur.role_name = 'admin'
    )
  );

CREATE POLICY "Admins can update newsletter subscriptions"
  ON public.newsletter_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
        AND ur.role_name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
        AND ur.role_name = 'admin'
    )
  );

CREATE POLICY "Admins can delete newsletter subscriptions"
  ON public.newsletter_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (select auth.uid())
        AND ur.role_name = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- 4.3: Fix event_newsletter_campaigns policies (created in PART 1)
-- ----------------------------------------------------------------------------
-- Drop the policies we created in PART 1
DROP POLICY IF EXISTS "Admins can read event_newsletter_campaigns" ON public.event_newsletter_campaigns;
DROP POLICY IF EXISTS "Admins can insert event_newsletter_campaigns" ON public.event_newsletter_campaigns;
DROP POLICY IF EXISTS "Admins can update event_newsletter_campaigns" ON public.event_newsletter_campaigns;
DROP POLICY IF EXISTS "Admins can delete event_newsletter_campaigns" ON public.event_newsletter_campaigns;

-- Recreate with optimized auth.uid()
CREATE POLICY "Admins can read event_newsletter_campaigns"
  ON public.event_newsletter_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role_name = 'admin'
    )
  );

CREATE POLICY "Admins can insert event_newsletter_campaigns"
  ON public.event_newsletter_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role_name = 'admin'
    )
  );

CREATE POLICY "Admins can update event_newsletter_campaigns"
  ON public.event_newsletter_campaigns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role_name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role_name = 'admin'
    )
  );

CREATE POLICY "Admins can delete event_newsletter_campaigns"
  ON public.event_newsletter_campaigns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (select auth.uid())
        AND user_roles.role_name = 'admin'
    )
  );

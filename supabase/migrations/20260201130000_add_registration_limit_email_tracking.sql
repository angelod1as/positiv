-- Migration: Add event_registration_limit_emails tracking table
-- Purpose: Track when admin notification emails are sent for registration limit events
-- Related: POS-438 - Admin email notifications when registration limit is reached

CREATE TABLE public.event_registration_limit_emails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    sent_at timestamptz NOT NULL DEFAULT NOW(),
    admin_emails text[] NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create unique index to prevent duplicate emails for the same event
CREATE UNIQUE INDEX idx_event_registration_limit_emails_event_id
ON public.event_registration_limit_emails(event_id);

-- Set owner
ALTER TABLE public.event_registration_limit_emails OWNER TO postgres;

-- Add table and column comments
COMMENT ON TABLE public.event_registration_limit_emails IS
'Tracks when admin notification emails are sent for events reaching registration limit.
Prevents duplicate notifications if an event is reopened and closed again.';

COMMENT ON COLUMN public.event_registration_limit_emails.id IS
'Primary key UUID for the email tracking record.';

COMMENT ON COLUMN public.event_registration_limit_emails.event_id IS
'Foreign key to the event that reached registration limit.';

COMMENT ON COLUMN public.event_registration_limit_emails.sent_at IS
'Timestamp when the notification email was sent to admins.';

COMMENT ON COLUMN public.event_registration_limit_emails.admin_emails IS
'Array of admin email addresses that received the notification.';

COMMENT ON COLUMN public.event_registration_limit_emails.created_at IS
'Timestamp when this record was created.';

-- Permissions: Only service_role should manage this table directly
GRANT ALL ON TABLE public.event_registration_limit_emails TO service_role;
REVOKE ALL ON TABLE public.event_registration_limit_emails FROM anon, authenticated;

-- Index comment
COMMENT ON INDEX idx_event_registration_limit_emails_event_id IS
'Ensures only one notification email per event. Prevents duplicates if event is reopened/closed again.';

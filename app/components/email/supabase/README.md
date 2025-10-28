# Supabase Authentication Email Templates

The Supabase authentication email templates have been moved to their proper location:

**Location:** `/supabase/templates/`

## Available Templates

The following authentication email templates are configured in `supabase/config.toml`:

- `confirmation.html` - Email confirmation on signup
- `recovery.html` - Password reset emails
- `magic-link.html` - Passwordless login links
- `email-change.html` - Email address change confirmation
- `invite-user.html` - Admin user invitations
- `reauthentication.html` - OTP code for reauthentication

## Design System

All templates follow the Positiv Email Design System with:
- Brand purple gradient background (#4a75d2 to #bf03c3)
- Nunito and DM Sans typography
- Purple primary buttons (#bf03c3)
- Consistent spacing and layout

See `/app/components/email/_design-system.md` for complete design specifications.

## Token Variables

Templates use Supabase's built-in variables:
- `{{ .SiteURL }}` - Base site URL
- `{{ .TokenHash }}` - URL-safe token hash for links
- `{{ .Token }}` - Plain 6-digit OTP code (reauthentication only)
- `{{ .Email }}` / `{{ .NewEmail }}` - Email addresses (email change only)

## Configuration

Email template configuration is managed in `/supabase/config.toml` under the `[auth.email.template.*]` sections.

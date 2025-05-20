-- Migration: Fix nullable columns in auth.users (Final Update with email_change)

-- This migration patches known issues where certain columns in auth.users
-- are incorrectly marked as NOT NULL and/or have problematic default NULLs
-- which can cause login/signup errors due to driver issues with NULL strings.
-- Includes all commonly affected string columns.

ALTER TABLE auth.users OWNER TO postgres;
GRANT ALL PRIVILEGES ON TABLE auth.users TO postgres;

-- Use a transaction block for atomicity
BEGIN;

-- Drop the NOT NULL constraint (Necessary if they were incorrectly NOT NULL)
-- Even if already nullable, dropping NOT NULL is idempotent.
ALTER TABLE auth.users ALTER COLUMN confirmation_token DROP NOT NULL;
ALTER TABLE auth.users ALTER COLUMN recovery_token DROP NOT NULL;
ALTER TABLE auth.users ALTER COLUMN email_change_token_new DROP NOT NULL;
ALTER TABLE auth.users ALTER COLUMN email_change_token_current DROP NOT NULL;
ALTER TABLE auth.users ALTER COLUMN email_change_sent_at DROP NOT NULL;
-- *** Added this column ***
ALTER TABLE auth.users ALTER COLUMN email_change DROP NOT NULL;
-- *************************


-- Set the DEFAULT value to an empty string '' instead of NULL for these STRING columns
-- This prevents NULLs from being inserted by default, sidestepping the driver bug for strings.
ALTER TABLE auth.users ALTER COLUMN confirmation_token SET DEFAULT '';
ALTER TABLE auth.users ALTER COLUMN recovery_token SET DEFAULT '';
ALTER TABLE auth.users ALTER COLUMN email_change_token_new SET DEFAULT '';
ALTER TABLE auth.users ALTER COLUMN email_change_token_current SET DEFAULT '';
-- *** Added this column ***
ALTER TABLE auth.users ALTER COLUMN email_change SET DEFAULT '';
-- *************************

-- Note: Timestamps (like email_change_sent_at) should NOT get SET DEFAULT ''.


-- Add comments to document the patch
COMMENT ON COLUMN auth.users.confirmation_token IS 'Confirmation token, defaults to empty string, can be NULL.';
COMMENT ON COLUMN auth.users.recovery_token IS 'Password recovery token, defaults to empty string, can be NULL.';
COMMENT ON COLUMN auth.users.email_change_token_new IS 'New email change token, defaults to empty string, can be NULL.';
COMMENT ON COLUMN auth.users.email_change_token_current IS 'Current email change token, defaults to empty string, can be NULL.';
COMMENT ON COLUMN auth.users.email_change_sent_at IS 'Timestamp email change was sent, can be NULL.';
-- Added comment
COMMENT ON COLUMN auth.users.email_change IS 'Pending new email address during change, defaults to empty string, can be NULL.';


-- Commit the transaction
COMMIT;

-- Note: These changes are a workaround for a known Supabase Auth bug.
-- Ideally, Supabase will fix the base schema definitions in the future.

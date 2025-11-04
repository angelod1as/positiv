-- Drop allow_marketing_email column from profiles table
-- This column has been replaced by the newsletter_subscriptions table

ALTER TABLE profiles DROP COLUMN IF EXISTS allow_marketing_email;

COMMENT ON TABLE profiles IS 'User profiles. Connected to Auth User table via user_id. Profile data retained if user account is deleted. Newsletter preferences now managed via newsletter_subscriptions table.';

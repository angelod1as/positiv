-- Migration: Create on_auth_user_created trigger

-- Grant necessary privileges to the user, replace 'your_user' with the actual database user
GRANT ALL PRIVILEGES ON TABLE auth.users TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- This trigger fires after a new user is inserted into auth.users
-- and executes the public.create_profile_on_signup function
-- to automatically create a corresponding profile row.
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_on_signup();

-- Note: Triggers on auth.users are often part of Supabase's base schema,
-- but explicitly creating it ensures it exists if missing.

-- Add comment
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically creates a public.profiles row after a new auth.users record is inserted.';

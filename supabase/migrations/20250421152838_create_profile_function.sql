-- Migration: create_profile_on_signup function
-- Done with help from Gemini — I won't remove any comments because they help me debug.

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- This is crucial! It allows the function to run with the privileges of the function owner (postgres), not the new user signing up. This lets it write to public.profiles even if the anon/authenticated role doesn't have direct insert permission.
AS $$
BEGIN
  -- Insert a new row into the profiles table
  -- It uses NEW.id and NEW.email from the row being inserted into auth.users
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);

  -- Return the new row, allowing the original insert operation (user signup) to complete
  RETURN new;
END;
$$;

-- Set the owner
ALTER FUNCTION public.create_profile_on_signup() OWNER TO postgres;

-- Grant execution permissions (allows roles to call this function, although it's usually called by a trigger)
GRANT ALL ON FUNCTION public.create_profile_on_signup() TO anon;
GRANT ALL ON FUNCTION public.create_profile_on_signup() TO authenticated;
GRANT ALL ON FUNCTION public.create_profile_on_signup() TO service_role;

-- Add a comment for documentation
COMMENT ON FUNCTION public.create_profile_on_signup() IS 'Creates a public.profiles row for a new user on auth.users signup.';

-- Migration: update_profile_email function

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.update_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as postgres, necessary to write to public.profiles
AS $$
BEGIN
  -- Update the profiles table's email for the corresponding user ID
  -- Uses NEW.email and NEW.id from the row being updated in auth.users
  UPDATE public.profiles
  SET email = new.email
  WHERE id = new.id; -- Match the profile row using the user's ID

  -- Return the new row, allowing the original update operation (email change) to complete
  RETURN new;
END;
$$;

-- Set the owner
ALTER FUNCTION public.update_profile_email() OWNER TO postgres;

-- Grant execution permissions
GRANT ALL ON FUNCTION public.update_profile_email() TO anon;
GRANT ALL ON FUNCTION public.update_profile_email() TO authenticated;
GRANT ALL ON FUNCTION public.update_profile_email() TO service_role;

-- Add a comment for documentation
COMMENT ON FUNCTION public.update_profile_email() IS 'Synchronizes the email in public.profiles with the email in auth.users on update.';

-- Add general_notes column to profiles table
ALTER TABLE profiles 
ADD COLUMN general_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.general_notes IS 'Observações gerais sobre o perfil';
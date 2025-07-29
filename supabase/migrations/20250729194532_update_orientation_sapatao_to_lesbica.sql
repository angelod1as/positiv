-- Update orientation from 'Sapatão' to 'Lésbica' in profiles table
UPDATE public.profiles
SET orientation = array_replace(orientation, 'Sapatão', 'Lésbica')
WHERE orientation @> ARRAY['Sapatão']::text[];
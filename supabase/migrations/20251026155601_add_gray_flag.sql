-- Add 'gray' value to profile_flag_enum

-- Rename the existing enum type
ALTER TYPE public.profile_flag_enum RENAME TO profile_flag_enum_old;

-- Create the new enum with 'gray' added
CREATE TYPE public.profile_flag_enum AS ENUM (
    'none',
    'yellow',
    'red',
    'gray'
);

-- Drop the default for the column
ALTER TABLE public.profiles ALTER COLUMN flag DROP DEFAULT;

-- Change the column's type to the new enum
-- All existing values will be preserved as they're already in the new enum
ALTER TABLE public.profiles
ALTER COLUMN flag TYPE public.profile_flag_enum USING flag::text::profile_flag_enum;

-- Restore the default
ALTER TABLE public.profiles ALTER COLUMN flag SET DEFAULT 'none'::profile_flag_enum;

-- Drop the old enum type
DROP TYPE public.profile_flag_enum_old;

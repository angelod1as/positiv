-- Create enum type for profile flags
CREATE TYPE public.profile_flag_enum AS ENUM (
    'none',
    'yellow',
    'red'
);

-- Add flag columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN flag public.profile_flag_enum NOT NULL DEFAULT 'none',
ADD COLUMN flag_notes text;
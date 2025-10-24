-- Add race_color to profiles table
ALTER TABLE public.profiles
ADD COLUMN race_color text [];

-- Add race_color columns to event_demographics_history table
ALTER TABLE public.event_demographics_history
ADD COLUMN race_color_white numeric(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN race_color_yellow numeric(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN race_color_indigenous numeric(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN race_color_black numeric(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN race_color_brown numeric(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN race_color_other_percentage numeric(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN race_color_other_values text [] DEFAULT '{}';

-- Add CHECK constraint to ensure participants are at least 18 years old
ALTER TABLE profiles
ADD CONSTRAINT check_minimum_age
CHECK (
  date_of_birth IS NULL OR
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) >= 18
);

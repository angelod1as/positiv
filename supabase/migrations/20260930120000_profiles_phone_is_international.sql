-- A phone is either a Brazilian mobile or, when this is set, a country code and
-- number. Existing phones are left as they are; the login guard asks anyone
-- whose phone fits neither to fix it.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_is_international boolean NOT NULL DEFAULT false;

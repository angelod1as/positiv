-- supabase/seeds/11_app_settings.sql

-- Production starts with card payments off. Local development starts with
-- them on, so every price a participant can be offered is there to try.

UPDATE public.app_settings SET card_payments_enabled = true;

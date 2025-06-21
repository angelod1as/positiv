-- Migration: Drop legacy add_user_role function

DROP FUNCTION IF EXISTS public.add_user_role(uuid, text);

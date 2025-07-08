-- Migration to fix mutable search_path for security functions

ALTER FUNCTION public.add_user_role(uuid, text) SET search_path = 'public';

ALTER FUNCTION public.update_veteran_status() SET search_path = 'public';

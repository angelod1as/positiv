-- Migration: Add new add_user_role_v2 function to avoid parameter/column ambiguity

CREATE FUNCTION public.add_user_role_v2(
    p_user_id uuid,
    p_role_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SET search_path = public;

  INSERT INTO public.user_roles (user_id, role_name)
  VALUES (p_user_id, p_role_name)
  ON CONFLICT (user_id, role_name) DO NOTHING;

END;
$$;

ALTER FUNCTION public.add_user_role_v2(uuid, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.add_user_role_v2(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.add_user_role_v2(uuid, text) FROM anon, authenticated;

COMMENT ON FUNCTION public.add_user_role_v2(uuid, text) IS 'SECURITY DEFINER function to add a role to a user in the public.user_roles table. Execution is restricted to privileged roles (e.g., service_role).';

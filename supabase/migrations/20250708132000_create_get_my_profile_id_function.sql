-- ROO: REVIEW
CREATE OR REPLACE FUNCTION get_my_profile_id()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT id FROM public.profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ROO: REVIEW END

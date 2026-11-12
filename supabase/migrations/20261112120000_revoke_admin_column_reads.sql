-- WEB-48: a participant can no longer read what the organisation wrote about
-- them, nor write their own profile, through the Data API.
--
-- The SELECT policies hand a participant their own profile and registrations,
-- and the grant covered every column. Holding their session and the anon key,
-- a participant could read profiles.flag, flag_notes, general_notes and
-- approved_to_attend, and admin_general_notes on each registration. The
-- authenticated grant becomes a column list without them. A column added later
-- is unreadable through the API until a migration grants it.
--
-- Since WEB-46 the server reads and writes both tables through Kysely as the
-- owner, and the e2e helpers use service_role; neither is affected. The only
-- supabase-js call left, get_profile_with_roles, is SECURITY DEFINER. A
-- PostgREST select=* on either table now fails for authenticated: nothing
-- issues one.
--
-- anon never reads or writes either table (its policies are all false), so it
-- loses every grant. Profiles writes go the way of event_participants in
-- WEB-47: through the API they only let a participant store data the server
-- never validated, such as a CPF.

REVOKE ALL ON public.profiles, public.event_participants FROM anon;

REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM authenticated;
REVOKE SELECT ON public.event_participants FROM authenticated;

GRANT SELECT (
  id,
  user_id,
  email,
  created_at,
  basic_data_filled,
  full_name,
  social_name,
  rg,
  cpf,
  pronouns,
  phone,
  date_of_birth,
  gender,
  orientation,
  where_lives,
  how_came_to_us,
  rg_issuer,
  is_veteran,
  became_veteran_date,
  race_color,
  provider_customer_id,
  phone_is_international,
  cpf_exempt
) ON public.profiles TO authenticated;

GRANT SELECT (
  id,
  profile_id,
  event_id,
  is_user_applied,
  application_date,
  cancellation_date,
  created_at,
  notes,
  referrals,
  companions,
  bond,
  application_status,
  attendance_status,
  spot_type,
  referred,
  updated_at,
  was_selected_for_rotation,
  cancellation_reason
) ON public.event_participants TO authenticated;

-- Without the grant these policies can never apply.
DROP POLICY IF EXISTS combined_authenticated_insert_profiles ON public.profiles;
DROP POLICY IF EXISTS combined_authenticated_update_profiles ON public.profiles;
DROP POLICY IF EXISTS combined_authenticated_delete_profiles ON public.profiles;

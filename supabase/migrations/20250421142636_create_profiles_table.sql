CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE,
    email text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    basic_data_filled boolean NOT NULL DEFAULT false,
    full_name text,
    social_name text,
    rg text,
    cpf text,
    pronouns text [],
    phone bigint,
    date_of_birth date,
    gender text [],
    orientation text [],
    where_lives text,
    how_came_to_us text,
    rg_issuer text,
    allow_marketing_email boolean DEFAULT false,

    CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL
);

ALTER TABLE public.profiles OWNER TO postgres; -- Removed quotes

COMMENT ON TABLE public.profiles IS 'User profiles. Connected to Auth User table via user_id. Profile data retained if user account is deleted.';
COMMENT ON COLUMN public.profiles.id IS 'Unique primary key for the profile record.';
COMMENT ON COLUMN public.profiles.user_id IS 'Foreign key to auth.users.id. Set to NULL if user deleted. Unique for non-null values.';
COMMENT ON COLUMN public.profiles.email IS 'User''s email address (often duplicated from auth.users).';
COMMENT ON COLUMN public.profiles.created_at IS 'Timestamp when the profile was created (UTC).';
COMMENT ON COLUMN public.profiles.basic_data_filled IS 'Boolean flag indicating if the initial required profile data has been completed.';
COMMENT ON COLUMN public.profiles.full_name IS 'The user''s full legal name.';
COMMENT ON COLUMN public.profiles.social_name IS 'The user''s preferred social name.';
COMMENT ON COLUMN public.profiles.rg IS 'Brazilian identity document number.';
COMMENT ON COLUMN public.profiles.cpf IS 'Brazilian individual taxpayer registry number.';
COMMENT ON COLUMN public.profiles.pronouns IS 'Array of preferred pronouns.';
COMMENT ON COLUMN public.profiles.phone IS 'Phone number, stored as bigint.';
COMMENT ON COLUMN public.profiles.date_of_birth IS 'The user''s date of birth.';
COMMENT ON COLUMN public.profiles.gender IS 'Array representing the user''s gender identity.';
COMMENT ON COLUMN public.profiles.orientation IS 'Array representing the user''s sexual orientation.';
COMMENT ON COLUMN public.profiles.where_lives IS 'General location information.';
COMMENT ON COLUMN public.profiles.how_came_to_us IS 'How the user learned about the service or organization.';
COMMENT ON COLUMN public.profiles.rg_issuer IS 'The issuing authority for the RG document.';
COMMENT ON COLUMN public.profiles.allow_marketing_email IS 'Boolean flag indicating consent for marketing emails.';

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

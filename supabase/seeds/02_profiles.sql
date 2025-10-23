-- Updated: Insert profiles for each user in auth.users with all fields filled
INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    basic_data_filled,
    social_name,
    pronouns,
    rg,
    cpf,
    phone,
    date_of_birth,
    gender,
    orientation,
    where_lives,
    how_came_to_us,
    rg_issuer,
    allow_marketing_email,
    is_veteran,
    approved_to_attend,
    flag,
    flag_notes,
    race_color
)
SELECT
    usr.id,
    usr.email,
    -- full_name
    CASE usr.email
        WHEN 'admin@example.com' THEN 'Master User Full Name'
        WHEN 'user1@example.com' THEN 'User One Full Name'
        WHEN 'user2@example.com' THEN 'User Two Full Name'
        WHEN 'user3@example.com' THEN 'User Three Full Name'
        WHEN 'user4@example.com' THEN 'User Four Full Name'
        WHEN 'user5@example.com' THEN 'User Five Full Name'
        WHEN 'user6@example.com' THEN 'User Six Full Name'
        WHEN 'user7@example.com' THEN 'User Seven Full Name'
        WHEN 'user8@example.com' THEN 'User Eight Full Name'
        WHEN 'user9@example.com' THEN 'User Nine Full Name'
    END,
    -- basic_data_filled
    true,
    -- social_name
    CASE usr.email
        WHEN 'admin@example.com' THEN 'Master'
        ELSE split_part(usr.email, '@', 1)
    END,
    -- pronouns
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['elu/delu']::text []
        WHEN 'user1@example.com' THEN ARRAY['ele/dele']::text []
        WHEN 'user2@example.com' THEN ARRAY['ela/dela']::text []
        WHEN 'user3@example.com' THEN ARRAY['ele/dele']::text []
        WHEN 'user4@example.com' THEN ARRAY['ela/dela']::text []
        WHEN 'user5@example.com' THEN ARRAY['ele/dele']::text []
        WHEN 'user6@example.com' THEN ARRAY['ela/dela']::text []
        WHEN 'user7@example.com' THEN ARRAY['ele/dele']::text []
        WHEN 'user8@example.com' THEN ARRAY['ela/dela']::text []
        WHEN 'user9@example.com' THEN ARRAY['ele/dele']::text []
    END,
    -- rg
    '000000000',
    -- cpf
    '00000000000',
    -- phone
    11999999999,
    -- date_of_birth
    CASE usr.email
        WHEN 'admin@example.com' THEN '1990-05-15'::date
        WHEN 'user1@example.com' THEN '1980-01-01'::date
        WHEN 'user2@example.com' THEN '1995-10-20'::date
        WHEN 'user3@example.com' THEN '1992-03-10'::date
        WHEN 'user4@example.com' THEN '1993-04-11'::date
        WHEN 'user5@example.com' THEN '1994-05-12'::date
        WHEN 'user6@example.com' THEN '1995-06-13'::date
        WHEN 'user7@example.com' THEN '1996-07-14'::date
        WHEN 'user8@example.com' THEN '1997-08-15'::date
        WHEN 'user9@example.com' THEN '1998-09-16'::date
    END,
    -- gender
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['Pessoa agênera']::text []
        WHEN 'user1@example.com' THEN ARRAY['Homem cis']::text []
        WHEN 'user2@example.com' THEN ARRAY['Mulher cis']::text []
        WHEN 'user3@example.com' THEN ARRAY['Homem trans']::text []
        WHEN 'user4@example.com' THEN ARRAY['Mulher trans']::text []
        WHEN 'user5@example.com' THEN ARRAY['Homem cis']::text []
        WHEN 'user6@example.com' THEN ARRAY['Mulher cis']::text []
        WHEN 'user7@example.com' THEN ARRAY['Homem cis']::text []
        WHEN 'user8@example.com' THEN ARRAY['Mulher cis']::text []
        WHEN 'user9@example.com' THEN ARRAY['Homem cis']::text []
    END,
    -- orientation
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['Pan']::text []
        WHEN 'user1@example.com' THEN ARRAY['Hétero']::text []
        WHEN 'user2@example.com' THEN ARRAY['Hétero']::text []
        WHEN 'user3@example.com' THEN ARRAY['Gay']::text []
        WHEN 'user4@example.com' THEN ARRAY['Lésbica']::text []
        WHEN 'user5@example.com' THEN ARRAY['Bissexual']::text []
        WHEN 'user6@example.com' THEN ARRAY['Hétero']::text []
        WHEN 'user7@example.com' THEN ARRAY['Hétero']::text []
        WHEN 'user8@example.com' THEN ARRAY['Bissexual']::text []
        WHEN 'user9@example.com' THEN ARRAY['Hétero']::text []
    END,
    -- where_lives
    CASE usr.email
        WHEN 'admin@example.com' THEN 'São Paulo, SP'
        WHEN 'user1@example.com' THEN 'Curitiba, PR'
        WHEN 'user2@example.com' THEN 'Rio de Janeiro, RJ'
        WHEN 'user3@example.com' THEN 'Belo Horizonte, MG'
        WHEN 'user4@example.com' THEN 'Porto Alegre, RS'
        WHEN 'user5@example.com' THEN 'Recife, PE'
        WHEN 'user6@example.com' THEN 'Salvador, BA'
        WHEN 'user7@example.com' THEN 'Fortaleza, CE'
        WHEN 'user8@example.com' THEN 'Brasília, DF'
        WHEN 'user9@example.com' THEN 'Manaus, AM'
    END,
    -- how_came_to_us
    'Seeded by Supabase',
    -- rg_issuer
    'SSP/SP',
    -- allow_marketing_email
    true,
    -- is_veteran (set true for admin, user1, user3, user4, user5; others false)
    CASE usr.email
        WHEN 'admin@example.com' THEN true
        WHEN 'user1@example.com' THEN true
        WHEN 'user3@example.com' THEN true
        WHEN 'user4@example.com' THEN true
        WHEN 'user5@example.com' THEN true
        ELSE false
    END,
    -- approved_to_attend
    CASE usr.email
        WHEN 'admin@example.com' THEN 'approved'::public.approved_to_attend_enum
        WHEN 'user1@example.com' THEN 'approved'::public.approved_to_attend_enum
        WHEN 'user2@example.com' THEN 'rejected'::public.approved_to_attend_enum
        WHEN 'user3@example.com' THEN 'approved_with_reservations'::public.approved_to_attend_enum
        WHEN 'user4@example.com' THEN 'pending'::public.approved_to_attend_enum
        WHEN 'user5@example.com' THEN 'approved'::public.approved_to_attend_enum
        WHEN 'user6@example.com' THEN 'approved'::public.approved_to_attend_enum
        WHEN 'user7@example.com' THEN 'rejected'::public.approved_to_attend_enum
        WHEN 'user8@example.com' THEN 'approved_with_reservations'::public.approved_to_attend_enum
        WHEN 'user9@example.com' THEN 'pending'::public.approved_to_attend_enum
        ELSE 'pending'::public.approved_to_attend_enum
    END,
    -- flag
    CASE usr.email
        WHEN 'admin@example.com' THEN 'none'::public.profile_flag_enum
        WHEN 'user1@example.com' THEN 'yellow'::public.profile_flag_enum
        WHEN 'user2@example.com' THEN 'red'::public.profile_flag_enum
        WHEN 'user3@example.com' THEN 'yellow'::public.profile_flag_enum
        ELSE 'none'::public.profile_flag_enum
    END,
    -- flag_notes
    CASE usr.email
        WHEN 'user1@example.com' THEN 'Teste de bandeira para a bandeira amarela'
        WHEN 'user2@example.com' THEN 'Teste de bandeira para a bandeira vermelha'
        WHEN 'user3@example.com' THEN 'Mais uma nota de teste'
        ELSE null
    END,
    -- race_color
    CASE usr.email
        WHEN 'user1@example.com' THEN ARRAY['Branco']::text []
        WHEN 'user2@example.com' THEN ARRAY['Preta']::text []
        WHEN 'user3@example.com' THEN ARRAY['Amarela']::text []
        WHEN 'user4@example.com' THEN ARRAY['Outra cor']::text []
        ELSE null
    END
FROM auth.users AS usr
WHERE usr.email IN (
        'admin@example.com',
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
        'user4@example.com',
        'user5@example.com',
        'user6@example.com',
        'user7@example.com',
        'user8@example.com',
        'user9@example.com'
    )
ON CONFLICT (user_id) DO NOTHING;

-- Seed public.user_roles
-- Assign the 'admin' role to the admin user
INSERT INTO public.user_roles (user_id, role_name)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (user_id, role_name) DO NOTHING;

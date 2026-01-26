-- supabase/seed/02_profiles.sql

-- This script creates 100 profiles with varied data.
-- First 10 profiles (admin, user1-9) are deterministic for test stability.
-- Profiles 10-99 are generated with randomized but realistic distributions.

-- ============================================================================
-- PART A: Deterministic profiles for first 10 users (admin, user1-9)
-- ============================================================================

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
    is_veteran,
    approved_to_attend,
    flag,
    flag_notes,
    race_color
)
SELECT
    usr.id,
    usr.email,
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
    true,
    CASE usr.email
        WHEN 'admin@example.com' THEN 'Master'
        ELSE split_part(usr.email, '@', 1)
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['elu/delu']::text[]
        WHEN 'user1@example.com' THEN ARRAY['ele/dele']::text[]
        WHEN 'user2@example.com' THEN ARRAY['ela/dela']::text[]
        WHEN 'user3@example.com' THEN ARRAY['ele/dele']::text[]
        WHEN 'user4@example.com' THEN ARRAY['ela/dela']::text[]
        WHEN 'user5@example.com' THEN ARRAY['ele/dele']::text[]
        WHEN 'user6@example.com' THEN ARRAY['ela/dela']::text[]
        WHEN 'user7@example.com' THEN ARRAY['ele/dele']::text[]
        WHEN 'user8@example.com' THEN ARRAY['ela/dela']::text[]
        WHEN 'user9@example.com' THEN ARRAY['ele/dele']::text[]
    END,
    '000000000',
    '00000000000',
    11999999999,
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
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['Pessoa agenera']::text[]
        WHEN 'user1@example.com' THEN ARRAY['Homem cis']::text[]
        WHEN 'user2@example.com' THEN ARRAY['Mulher cis']::text[]
        WHEN 'user3@example.com' THEN ARRAY['Homem trans']::text[]
        WHEN 'user4@example.com' THEN ARRAY['Mulher trans']::text[]
        WHEN 'user5@example.com' THEN ARRAY['Homem cis']::text[]
        WHEN 'user6@example.com' THEN ARRAY['Mulher cis']::text[]
        WHEN 'user7@example.com' THEN ARRAY['Homem cis']::text[]
        WHEN 'user8@example.com' THEN ARRAY['Mulher cis']::text[]
        WHEN 'user9@example.com' THEN ARRAY['Homem cis']::text[]
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['Pan']::text[]
        WHEN 'user1@example.com' THEN ARRAY['Hetero']::text[]
        WHEN 'user2@example.com' THEN ARRAY['Hetero']::text[]
        WHEN 'user3@example.com' THEN ARRAY['Gay']::text[]
        WHEN 'user4@example.com' THEN ARRAY['Lesbica']::text[]
        WHEN 'user5@example.com' THEN ARRAY['Bissexual']::text[]
        WHEN 'user6@example.com' THEN ARRAY['Hetero']::text[]
        WHEN 'user7@example.com' THEN ARRAY['Hetero']::text[]
        WHEN 'user8@example.com' THEN ARRAY['Bissexual']::text[]
        WHEN 'user9@example.com' THEN ARRAY['Hetero']::text[]
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN 'Sao Paulo, SP'
        WHEN 'user1@example.com' THEN 'Curitiba, PR'
        WHEN 'user2@example.com' THEN 'Rio de Janeiro, RJ'
        WHEN 'user3@example.com' THEN 'Belo Horizonte, MG'
        WHEN 'user4@example.com' THEN 'Porto Alegre, RS'
        WHEN 'user5@example.com' THEN 'Recife, PE'
        WHEN 'user6@example.com' THEN 'Salvador, BA'
        WHEN 'user7@example.com' THEN 'Fortaleza, CE'
        WHEN 'user8@example.com' THEN 'Brasilia, DF'
        WHEN 'user9@example.com' THEN 'Manaus, AM'
    END,
    'Seeded by Supabase',
    'SSP/SP',
    CASE usr.email
        WHEN 'admin@example.com' THEN true
        WHEN 'user1@example.com' THEN true
        WHEN 'user3@example.com' THEN true
        WHEN 'user4@example.com' THEN true
        WHEN 'user5@example.com' THEN true
        ELSE false
    END,
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
    CASE usr.email
        WHEN 'admin@example.com' THEN 'none'::public.profile_flag_enum
        WHEN 'user1@example.com' THEN 'yellow'::public.profile_flag_enum
        WHEN 'user2@example.com' THEN 'red'::public.profile_flag_enum
        WHEN 'user3@example.com' THEN 'yellow'::public.profile_flag_enum
        ELSE 'none'::public.profile_flag_enum
    END,
    CASE usr.email
        WHEN 'user1@example.com' THEN 'Esta e uma nota de bandeira muito longa para testar se o tooltip esta sendo cortado pelo header da tabela ou pelo container principal. A nota contem varias linhas de texto para verificar o comportamento do z-index e do posicionamento do tooltip quando ultrapassa os limites da celula.'
        WHEN 'user2@example.com' THEN 'Teste de bandeira para a bandeira vermelha'
        WHEN 'user3@example.com' THEN 'Mais uma nota de teste'
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['Branca']::text[]
        WHEN 'user1@example.com' THEN ARRAY['Branca']::text[]
        WHEN 'user2@example.com' THEN ARRAY['Preta']::text[]
        WHEN 'user3@example.com' THEN ARRAY['Amarela']::text[]
        WHEN 'user4@example.com' THEN ARRAY['Indigena']::text[]
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

-- ============================================================================
-- PART B: Generated profiles for users 10-99
-- ============================================================================

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
    is_veteran,
    approved_to_attend,
    flag,
    flag_notes,
    race_color
)
SELECT
    usr.id,
    usr.email,
    'Generated User ' || split_part(usr.email, '@', 1),
    true,
    CASE WHEN random() < 0.30 THEN 'Social ' || split_part(usr.email, '@', 1) ELSE null END,
    CASE
        WHEN random() < 0.70 THEN
            ARRAY[(ARRAY['ela/dela', 'ele/dele', 'elu/delu'])[floor(random() * 3 + 1)::int]]
        ELSE
            ARRAY[
                (ARRAY['ela/dela', 'ele/dele', 'elu/delu'])[floor(random() * 3 + 1)::int],
                (ARRAY['ela/dela', 'ele/dele', 'elu/delu'])[floor(random() * 3 + 1)::int]
            ]
    END,
    lpad((floor(random() * 999999999)::bigint)::text, 9, '0'),
    lpad((floor(random() * 99999999999)::bigint)::text, 11, '0'),
    (11900000000 + floor(random() * 99999999)::bigint),
    (current_date - (interval '1 year' * (18 + floor(random() * 42)::int)))::date,
    CASE
        WHEN random() < 0.80 THEN
            ARRAY[(ARRAY['Homem cis', 'Mulher cis', 'Homem trans', 'Mulher trans', 'Pessoa agenera', 'Pessoa nao-binaria'])[floor(random() * 6 + 1)::int]]
        ELSE
            ARRAY[
                (ARRAY['Homem cis', 'Mulher cis', 'Homem trans', 'Mulher trans', 'Pessoa agenera', 'Pessoa nao-binaria'])[floor(random() * 6 + 1)::int],
                (ARRAY['Homem cis', 'Mulher cis', 'Homem trans', 'Mulher trans', 'Pessoa agenera', 'Pessoa nao-binaria'])[floor(random() * 6 + 1)::int]
            ]
    END,
    CASE
        WHEN random() < 0.75 THEN
            ARRAY[(ARRAY['Hetero', 'Bissexual', 'Gay', 'Lesbica', 'Pan', 'Assexual'])[floor(random() * 6 + 1)::int]]
        ELSE
            ARRAY[
                (ARRAY['Hetero', 'Bissexual', 'Gay', 'Lesbica', 'Pan', 'Assexual'])[floor(random() * 6 + 1)::int],
                (ARRAY['Hetero', 'Bissexual', 'Gay', 'Lesbica', 'Pan', 'Assexual'])[floor(random() * 6 + 1)::int]
            ]
    END,
    (ARRAY[
        'Sao Paulo, SP',
        'Rio de Janeiro, RJ',
        'Belo Horizonte, MG',
        'Curitiba, PR',
        'Porto Alegre, RS',
        'Salvador, BA',
        'Recife, PE',
        'Fortaleza, CE',
        'Brasilia, DF',
        'Manaus, AM',
        'Campinas, SP',
        'Florianopolis, SC',
        'Goiania, GO',
        'Vitoria, ES',
        'Natal, RN'
    ])[floor(random() * 15 + 1)::int],
    (ARRAY[
        'Instagram',
        'Indicacao de amigo',
        'Redes sociais',
        'Evento anterior',
        'Busca no Google',
        'Twitter',
        'TikTok',
        'Telegram',
        'WhatsApp'
    ])[floor(random() * 9 + 1)::int],
    (ARRAY['SSP/SP', 'SSP/RJ', 'SSP/MG', 'SSP/PR', 'SSP/RS', 'SSP/BA', 'SSP/PE', 'SSP/CE', 'SSP/DF', 'SSP/AM'])[floor(random() * 10 + 1)::int],
    random() < 0.20,
    CASE
        WHEN random() < 0.70 THEN 'approved'::public.approved_to_attend_enum
        WHEN random() < 0.82 THEN 'pending'::public.approved_to_attend_enum
        WHEN random() < 0.90 THEN 'rejected'::public.approved_to_attend_enum
        ELSE 'approved_with_reservations'::public.approved_to_attend_enum
    END,
    CASE
        WHEN random() < 0.85 THEN 'none'::public.profile_flag_enum
        WHEN random() < 0.95 THEN 'yellow'::public.profile_flag_enum
        ELSE 'red'::public.profile_flag_enum
    END,
    null,
    CASE
        WHEN random() < 0.85 THEN
            ARRAY[(ARRAY['Branca', 'Preta', 'Parda', 'Amarela', 'Indigena'])[floor(random() * 5 + 1)::int]]
        ELSE
            ARRAY[
                (ARRAY['Branca', 'Preta', 'Parda', 'Amarela', 'Indigena'])[floor(random() * 5 + 1)::int],
                (ARRAY['Branca', 'Preta', 'Parda', 'Amarela', 'Indigena'])[floor(random() * 5 + 1)::int]
            ]
    END
FROM auth.users AS usr
WHERE usr.email LIKE 'user%@example.com'
  AND usr.email NOT IN (
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

-- Update flag_notes for profiles with flags
UPDATE public.profiles
SET flag_notes = CASE flag
    WHEN 'yellow' THEN 'Observacao importante sobre este participante - requer atencao'
    WHEN 'red' THEN 'Alerta critico - verificar historico antes de aprovar'
    ELSE null
END
WHERE flag != 'none'
  AND flag_notes IS NULL;

-- ============================================================================
-- Seed public.user_roles
-- ============================================================================

INSERT INTO public.user_roles (user_id, role_name)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (user_id, role_name) DO NOTHING;

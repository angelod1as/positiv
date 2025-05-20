-- Insert profiles for each user in auth.users
INSERT INTO public.profiles (
    user_id,        -- Foreign key to auth.users
    email,          -- Email must be included as it's not nullable
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
    allow_marketing_email
)
SELECT
    usr.id,  -- Link the profile to the user ID
    usr.email, -- Include email since it is not nullable
    CASE usr.email
        WHEN 'admin@example.com' THEN 'Master User Full Name'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'User Two Full Name'
        ELSE split_part(usr.email, '@', 1) || ' Full Name'
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN true
        WHEN 'user1@example.com' THEN false
        WHEN 'user2@example.com' THEN true
        ELSE false
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN 'Master'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'User Two'
        ELSE split_part(usr.email, '@', 1)
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['elu/delu']::text []
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN ARRAY['ela/dela']::text []
        ELSE ARRAY['ele/dele', 'ela/dela']::text []
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN '123456789'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN '987654321'
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN '98765432100'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN '12345678999'
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN 11987654321
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 21912345678
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN '1990-05-15'::date
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN '1995-10-20'::date
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['Pessoa agênera']::text []
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN ARRAY['Mulher cis']::text []
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['Pan']::text []
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN ARRAY['Hétero']::text []
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN 'São Paulo, SP'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'Rio de Janeiro, RJ'
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN 'Seeded by Supabase'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'Referred by Friend'
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN 'SSP/SP'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'SSP/RJ'
        ELSE null
    END,
    CASE usr.email
        WHEN 'admin@example.com' THEN true
        WHEN 'user1@example.com' THEN false
        WHEN 'user2@example.com' THEN true
        ELSE false
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
ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate profile assignments

-- Seed public.user_roles
-- Assign the 'admin' role to the admin user
INSERT INTO public.user_roles (user_id, role_name)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (user_id, role_name) DO NOTHING;

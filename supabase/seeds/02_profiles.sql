-- supabase/seed/02_profiles.sql

-- This script UPDATES public.profiles rows created by the trigger
-- Populates profiles with specific data for admin@example.com and user2@example.com,
-- and generic/empty data for user1@example.com and the rest.
-- It also assigns the admin role.

-- Update public.profiles rows (created by the trigger) with detailed data
UPDATE public.profiles AS prof
SET
    -- Use CASE WHEN logic to set column values based on the associated auth.user email (using alias usr)
    full_name = CASE usr.email
        WHEN 'admin@example.com' THEN 'Master User Full Name'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'User Two Full Name'
        ELSE split_part(usr.email, '@', 1) || ' Full Name'
    END,

    basic_data_filled = CASE usr.email
        WHEN 'admin@example.com' THEN true
        WHEN 'user1@example.com' THEN false
        WHEN 'user2@example.com' THEN true
        ELSE false
    END,

    social_name = CASE usr.email
        WHEN 'admin@example.com' THEN 'Master' -- To avoid clashing with "Admin" on breadcrumb
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'User Two'
        ELSE split_part(usr.email, '@', 1)
    END,

    pronouns = CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['elu/delu']::text []
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN ARRAY['ela/dela']::text []
        ELSE ARRAY['ele/dele', 'ela/dela']::text []
    END,

    rg = CASE usr.email
        WHEN 'admin@example.com' THEN '123456789'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN '987654321'
        ELSE null
    END,

    cpf = CASE usr.email
        WHEN 'admin@example.com' THEN '98765432100'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN '12345678999'
        ELSE null
    END,

    phone = CASE usr.email
        WHEN 'admin@example.com' THEN 11987654321
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 21912345678
        ELSE null
    END,

    date_of_birth = CASE usr.email
        WHEN 'admin@example.com' THEN '1990-05-15'::date
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN '1995-10-20'::date
        ELSE null
    END,

    gender = CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['Pessoa agênera']::text []
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN ARRAY['Mulher cis']::text []
        ELSE null
    END,

    orientation = CASE usr.email
        WHEN 'admin@example.com' THEN ARRAY['Pan']::text []
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN ARRAY['Hétero']::text []
        ELSE null
    END,

    where_lives = CASE usr.email
        WHEN 'admin@example.com' THEN 'São Paulo, SP'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'Rio de Janeiro, RJ'
        ELSE null
    END,

    how_came_to_us = CASE usr.email
        WHEN 'admin@example.com' THEN 'Seeded by Supabase'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'Referred by Friend'
        ELSE null
    END,

    rg_issuer = CASE usr.email
        WHEN 'admin@example.com' THEN 'SSP/SP'
        WHEN 'user1@example.com' THEN null
        WHEN 'user2@example.com' THEN 'SSP/RJ'
        ELSE null
    END,

    allow_marketing_email = CASE usr.email
        WHEN 'admin@example.com' THEN true
        WHEN 'user1@example.com' THEN false
        WHEN 'user2@example.com' THEN true
        ELSE false
    END
-- Specify the source table (auth.users) for selecting data using alias 'usr'
FROM auth.users AS usr
-- This is the JOIN/FILTER condition
-- Update the profile (prof) ONLY where its user_id matches a user (usr) from auth.users
-- AND that user's email is in our list of seeded users.
WHERE prof.user_id = usr.id
    AND usr.email IN (
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
    );


-- Seed public.user_roles
-- Assign the 'admin' role to the admin user (this INSERT is still needed)
INSERT INTO public.user_roles (user_id, role_name)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (user_id, role_name) DO NOTHING; -- Prevent duplicate role assignments

-- supabase/seed/01_auth.sql

-- This script creates 100 test users and their identities for Supabase authentication.
-- First 10 users (admin, user1-9) are deterministic for test stability.
-- Users 10-99 are generated using generate_series.

-- Insert test users into the auth.users table
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    CASE
        WHEN n = 0 THEN 'admin@example.com'
        ELSE 'user' || n || '@example.com'
    END,
    extensions.crypt('test1234', extensions.gen_salt('bf')),
    current_timestamp,
    current_timestamp,
    current_timestamp,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    current_timestamp,
    current_timestamp,
    '',
    '',
    '',
    ''
FROM generate_series(0, 99) AS n;

-- Insert identities for all users in auth.identities
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    users.id,
    format('{"sub":"%s","email":"%s"}', users.id::text, users.email)::jsonb,
    'email',
    users.id,
    current_timestamp,
    current_timestamp,
    current_timestamp
FROM auth.users AS users
WHERE users.email LIKE '%@example.com'
ON CONFLICT (provider_id, provider) DO NOTHING;

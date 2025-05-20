-- supabase/seed/01_auth.sql

-- This script creates multiple test users and their identities for Supabase authentication.

-- Insert test users into the auth.users table
INSERT INTO auth.users (
    instance_id,           -- Default instance ID for Supabase
    id,                    -- User ID (UUID, auto-generated)
    aud,                   -- Audience type
    role,                  -- Role for Row-Level Security
    email,                 -- User email
    encrypted_password,    -- Password, will be hashed
    email_confirmed_at,    -- Confirmation timestamp
    recovery_sent_at,      -- Recovery email sent timestamp
    last_sign_in_at,       -- Last sign-in timestamp
    raw_app_meta_data,     -- Application metadata in JSONB format
    raw_user_meta_data,    -- User metadata in JSONB format
    created_at,            -- Creation timestamp
    updated_at,            -- Update timestamp
    confirmation_token,    -- Email confirmation token
    email_change,          -- Email change
    email_change_token_new,-- Email change token
    recovery_token         -- Recovery token
)
SELECT
    '00000000-0000-0000-0000-000000000000', -- Default instance ID
    uuid_generate_v4(),                    -- Generate unique UUID for each user
    'authenticated',                       -- Default audience
    'authenticated',                       -- Role for Auth system
    users_data.email,                      -- Email from defined test data
    crypt(users_data.raw_password, gen_salt('bf')), -- Password hashing
    current_timestamp,                     -- Email confirmed now
    current_timestamp,                     -- Recovery email sent now
    current_timestamp,                     -- Last sign-in set to now
    '{"provider":"email","providers":["email"]}'::jsonb, -- Metadata for email provider
    '{}'::jsonb,                           -- Empty user metadata
    current_timestamp,                     -- Record creation timestamp
    current_timestamp,                     -- Record update timestamp
    '',                                    -- Empty confirmation token
    '',                                    -- Empty email change
    '',                                    -- Empty email change token
    ''                                     -- Empty recovery token
FROM (
    -- Define 10 users: 1 admin and 9 standard users
    VALUES
    ('admin@example.com', 'Admin@Example'), -- Admin user
    ('user1@example.com', 'User1@Example'),
    ('user2@example.com', 'User2@Example'),
    ('user3@example.com', 'User3@Example'),
    ('user4@example.com', 'User4@Example'),
    ('user5@example.com', 'User5@Example'),
    ('user6@example.com', 'User6@Example'),
    ('user7@example.com', 'User7@Example'),
    ('user8@example.com', 'User8@Example'),
    ('user9@example.com', 'User9@Example')
) AS users_data (email, raw_password); -- Alias for clarity

-- Insert identities for the users in auth.identities
INSERT INTO auth.identities (
    id,                    -- Identity ID (UUID)
    user_id,               -- ID of the user
    identity_data,         -- Provider-specific identity data in JSONB
    provider,              -- Provider name
    provider_id,           -- Provider ID (same as user ID for email)
    last_sign_in_at,       -- Last sign-in timestamp
    created_at,            -- Creation timestamp
    updated_at             -- Update timestamp
)
SELECT
    uuid_generate_v4(), -- Generate unique UUID for the identity
    users.id AS id1,    -- Link to user's ID
    format('{"sub":"%s","email":"%s"}', users.id::text, users.email)::jsonb, -- Identity data
    'email',            -- Provider name
    users.id AS id2,    -- Provider ID (same as user ID for email)
    current_timestamp,  -- Last sign-in set to now
    current_timestamp,  -- Creation timestamp
    current_timestamp   -- Update timestamp
FROM
    auth.users AS users
WHERE
    users.email IN (   -- Filter for the specified test users
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
ON CONFLICT (provider_id, provider) DO NOTHING; -- Avoid duplicates if identity exists

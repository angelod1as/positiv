-- Seed newsletter subscriptions for test users
-- This creates newsletter subscription records for local testing

INSERT INTO public.newsletter_subscriptions (
    profile_id,
    consent_given,
    consent_given_at,
    subscribed_at,
    unsubscribed_at,
    subscription_source,
    sync_status
)
SELECT
    p.id as profile_id,
    -- Admin and some users have consented
    CASE p.email
        WHEN 'admin@example.com' THEN true
        WHEN 'user1@example.com' THEN true
        WHEN 'user2@example.com' THEN false  -- declined during onboarding
        WHEN 'user3@example.com' THEN true
        WHEN 'user4@example.com' THEN true
        WHEN 'user5@example.com' THEN false  -- unsubscribed after initially accepting
        ELSE true
    END as consent_given,
    -- consent_given_at
    p.created_at as consent_given_at,
    -- subscribed_at (only set if they subscribed)
    CASE p.email
        WHEN 'user2@example.com' THEN NULL  -- never subscribed
        WHEN 'user5@example.com' THEN p.created_at  -- was subscribed before unsubscribing
        ELSE p.created_at
    END as subscribed_at,
    -- unsubscribed_at
    CASE p.email
        WHEN 'user2@example.com' THEN p.created_at  -- declined during onboarding
        WHEN 'user5@example.com' THEN now() - interval '7 days'  -- unsubscribed later
        ELSE NULL
    END as unsubscribed_at,
    -- subscription_source
    'backfill' as subscription_source,
    -- sync_status
    CASE p.email
        WHEN 'user2@example.com' THEN 'unsubscribed'  -- declined during onboarding
        WHEN 'user5@example.com' THEN 'unsubscribed'  -- unsubscribed after accepting
        ELSE 'pending'
    END as sync_status
FROM public.profiles p
WHERE p.email IN (
    'admin@example.com',
    'user1@example.com',
    'user2@example.com',
    'user3@example.com',
    'user4@example.com',
    'user5@example.com'
);

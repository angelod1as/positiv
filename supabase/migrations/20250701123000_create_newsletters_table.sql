-- Drop types if they exist (use with caution in production)
DROP TYPE IF EXISTS public.newsletter_status CASCADE;
DROP TYPE IF EXISTS public.newsletter_audience CASCADE;

-- Create newsletter status enum
CREATE TYPE public.newsletter_status AS ENUM ('draft', 'sent');

-- Create newsletter audience enum
CREATE TYPE public.newsletter_audience AS ENUM (
    'all_participants',
    'past_participants'
);

-- Create newsletters table
CREATE TABLE public.newsletters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    audience public.newsletter_audience NOT NULL DEFAULT 'all_participants',
    status public.newsletter_status NOT NULL DEFAULT 'draft',
    sent_at timestamp with time zone NULL
);

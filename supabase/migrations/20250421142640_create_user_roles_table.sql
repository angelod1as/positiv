-- Migration: Create user_roles table

CREATE TABLE public.user_roles (
    user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE, -- Link to auth.users
    role_name text NOT NULL, -- The name of the role (e.g., 'admin', 'editor')
    created_at timestamptz NOT NULL DEFAULT now(), -- Track when role was assigned

    PRIMARY KEY (user_id, role_name) -- A user can have multiple roles, but not the same role twice
);

-- Set owner
ALTER TABLE public.user_roles OWNER TO postgres;

-- Add comments
COMMENT ON TABLE public.user_roles IS 'Stores roles assigned to users.';
COMMENT ON COLUMN public.user_roles.user_id IS 'The user ID from auth.users.';
COMMENT ON COLUMN public.user_roles.role_name IS 'The name of the role assigned.';

-- Initially, only service_role should likely manage these roles directly.
-- RLS policies will be added later.
GRANT ALL ON TABLE public.user_roles TO service_role; -- Allow service_role to manage
-- Deny direct access to others for now (RLS will enforce this more granularly)
REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;

-- Note: RLS will be ENABLED in a later RLS-specific migration file.

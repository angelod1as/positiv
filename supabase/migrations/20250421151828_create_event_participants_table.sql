CREATE TABLE public.event_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    profile_id uuid,
    event_id uuid NOT NULL,

    user_applied_status boolean NOT NULL DEFAULT true,
    payment numeric(10, 2),
    process_status text NOT NULL DEFAULT 'applied',

    application_date timestamp with time zone NOT NULL DEFAULT now(),
    cancellation_date timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),

    CONSTRAINT event_participants_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles (
        id
    ) ON DELETE SET NULL,
    CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events (id) ON DELETE CASCADE
);

ALTER TABLE public.event_participants OWNER TO postgres;

COMMENT ON TABLE public.event_participants IS 'Tracks participation of profiles in events. If a profile is deleted, the link via profile_id is set to NULL.';
COMMENT ON COLUMN public.event_participants.id IS 'Unique primary key for the participation record.';
COMMENT ON COLUMN public.event_participants.profile_id IS 'Foreign key linking to the public.profiles table. Nullable. ON DELETE SET NULL means the link is removed if the profile is deleted, but the participation record remains.';
COMMENT ON COLUMN public.event_participants.event_id IS 'Foreign key linking to the public.events table. Not nullable as participation requires an event. ON DELETE CASCADE ensures participation is removed if event is deleted.';
COMMENT ON COLUMN public.event_participants.user_applied_status IS 'Boolean indicating if the user initiated the application (vs being added by admin). Defaults to true.';
COMMENT ON COLUMN public.event_participants.payment IS 'The amount paid by the participant for this event. Nullable if payment is not required or pending.';
COMMENT ON COLUMN public.event_participants.process_status IS 'The current status of the participant in the event''s process (e.g., applied, accepted, waitlisted, rejected, confirmed, attended). Defaults to ''applied''.';
COMMENT ON COLUMN public.event_participants.application_date IS 'Timestamp when the participant applied or was added to the event. Not nullable, defaults to now().';
COMMENT ON COLUMN public.event_participants.cancellation_date IS 'Timestamp when the participant cancelled or was cancelled from the event. Nullable.';
COMMENT ON COLUMN public.event_participants.created_at IS 'Timestamp when this participation record was first created in the database. Not nullable, defaults to now().';

GRANT ALL ON TABLE public.event_participants TO anon;
GRANT ALL ON TABLE public.event_participants TO authenticated;
GRANT ALL ON TABLE public.event_participants TO service_role;

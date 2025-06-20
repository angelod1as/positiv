-- Create event_reminders table, that stores the necessary email reminders to be sent to the users

CREATE TABLE public.event_reminders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    email_sent boolean DEFAULT false NOT NULL,
    email_sent_date timestamp with time zone DEFAULT null,

    CONSTRAINT event_reminders_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events (id) ON DELETE CASCADE,
    CONSTRAINT event_reminders_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles (
        id
    ) ON DELETE CASCADE
);

ALTER TABLE public.event_reminders OWNER TO postgres;

COMMENT ON TABLE public.event_reminders IS 'Event reminders. This table is used when the user chooses to be reminded of upcoming events';
COMMENT ON COLUMN public.event_reminders.id IS 'Unique primary key for the profile record.';
COMMENT ON COLUMN public.event_reminders.profile_id IS 'Foreign key to profiles.id.';
COMMENT ON COLUMN public.event_reminders.event_id IS 'Foreign key to events.id.';
COMMENT ON COLUMN public.event_reminders.created_at IS 'Timestamp when the profile was created (UTC).';
COMMENT ON COLUMN public.event_reminders.email_sent IS 'Boolean representing if the reminder email has already been sent.';
COMMENT ON COLUMN public.event_reminders.email_sent_date IS 'Date in which the email was sent';

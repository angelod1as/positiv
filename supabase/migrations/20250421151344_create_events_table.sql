CREATE TABLE public.events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text,
    location text,
    description text,
    emoji text,
    -- Important Timestamps (using timestamptz for time zone awareness)
    starting_time timestamp with time zone,
    ending_time timestamp with time zone,
    application_open_time timestamp with time zone,
    application_close_time timestamp with time zone,
    interview_process_start timestamp with time zone,
    interview_process_end timestamp with time zone,
    payment_start_date timestamp with time zone,
    payment_end_date timestamp with time zone,
    group_open_date timestamp with time zone,
    group_close_date timestamp with time zone,
    ticket_price numeric(10, 2),
    total_spots integer,
    event_status text NOT NULL DEFAULT 'Draft',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.events OWNER TO postgres;

COMMENT ON TABLE public.events IS 'Stores information about events.';
COMMENT ON COLUMN public.events.id IS 'Unique identifier for the event record (primary key).';
COMMENT ON COLUMN public.events.title IS 'The official title or name of the event.';
COMMENT ON COLUMN public.events.location IS 'The physical location where the event will take place.';
COMMENT ON COLUMN public.events.description IS 'A detailed description providing more context about the event.';
COMMENT ON COLUMN public.events.emoji IS 'A emoji associated with the event for display purposes.';
COMMENT ON COLUMN public.events.starting_time IS 'The scheduled start date and time of the event (in UTC).';
COMMENT ON COLUMN public.events.ending_time IS 'The scheduled end date and time of the event (in UTC).';
COMMENT ON COLUMN public.events.application_open_time IS 'The timestamp when applications or registrations for the event open (in UTC).';
COMMENT ON COLUMN public.events.application_close_time IS 'The timestamp when applications or registrations for the event close (in UTC).';
COMMENT ON COLUMN public.events.interview_process_start IS 'The timestamp when the interview phase for potential participants begins (in UTC).';
COMMENT ON COLUMN public.events.interview_process_end IS 'The timestamp when the interview phase for potential participants ends (in UTC).';
COMMENT ON COLUMN public.events.payment_start_date IS 'The timestamp when payment collection for selected participants begins (in UTC).';
COMMENT ON COLUMN public.events.payment_end_date IS 'The timestamp when payment collection for selected participants ends (in UTC).';
COMMENT ON COLUMN public.events.group_open_date IS 'The timestamp when participant group assignments are revealed or become available (in UTC).';
COMMENT ON COLUMN public.events.group_close_date IS 'The timestamp when participant group assignments are finalized or locked (in UTC).';
COMMENT ON COLUMN public.events.ticket_price IS 'The price (numeric, up to 2 decimal places) required for participation';
COMMENT ON COLUMN public.events.total_spots IS 'The maximum number of participants the event can accommodate.';
COMMENT ON COLUMN public.events.event_status IS 'The current state of the event (e.g., Draft, Published, Open, Active, Completed, Cancelled). Defaults to Draft. See frontend code for values';
COMMENT ON COLUMN public.events.created_at IS 'The timestamp when this event record was created (in UTC). Automatically set on creation.';

-- Grant permissions to roles
GRANT ALL ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;

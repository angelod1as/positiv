-- supabase/seed/04_event_participants.sql

-- Clear existing data from the public.event_participants table
TRUNCATE public.event_participants CASCADE;

-- Use a DO block to handle variables and a single atomic insert
DO $$
DECLARE
    -- Declare variables for specific profile IDs (based on email)
    admin_profile_id uuid;
    user1_profile_id uuid;
    user2_profile_id uuid; -- Add variables for other specific users if needed

    -- Declare variables for specific event IDs (based on title or status+index)
    event_id_reg_open_1 uuid;
    event_id_reg_closed_1 uuid;
    event_id_cancelled_1 uuid;
    event_id_completed_1 uuid; -- Use this one for the 'attended' scenario
    event_id_scheduled_1 uuid;
    -- Removed: event_id_active_1 uuid; -- This event no longer exists

BEGIN
    -- Retrieve specific profile IDs based on user emails (from 01_auth.sql)
    SELECT p.id INTO admin_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'admin@example.com';
    SELECT p.id INTO user1_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user1@example.com';
    SELECT p.id INTO user2_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user2@example.com';
    -- Add selects for other specific user profile IDs if needed

    -- Retrieve specific event IDs based on titles or statuses (from 03_events.sql)
    SELECT id INTO event_id_reg_open_1   FROM public.events WHERE title = 'Evento Com Inscrições Abertas 1';
    SELECT id INTO event_id_reg_closed_1 FROM public.events WHERE title = 'Evento Com Inscrições Fechadas 1';
    SELECT id INTO event_id_cancelled_1  FROM public.events WHERE title = 'Evento Cancelado 2'; -- Assumes this title is correct
    SELECT id INTO event_id_completed_1  FROM public.events WHERE title = 'Evento Concluído 1';
    SELECT id INTO event_id_scheduled_1  FROM public.events WHERE title = 'Evento Agendado 1';
    -- Removed: SELECT id INTO event_id_active_1 FROM public.events WHERE title = 'Active Event 1'; -- This event no longer exists

    -- Note: Ensure the titles/emails used above exactly match your 01_auth.sql and 03_events.sql files.

    -- ### Seed public.event_participants ###
    -- Insert specific participation records using the retrieved IDs

    INSERT INTO public.event_participants (profile_id, event_id, user_applied_status, process_status, application_date, cancellation_date, payment)
    VALUES
    -- Admin's Participations (Example Scenarios)
    (
        admin_profile_id,              -- profile_id: Admin
        event_id_reg_open_1,           -- event_id: Registration Open
        TRUE,                          -- user_applied_status: Applied by user
        'confirmed',                   -- process_status: Confirmed
        now() - interval '2 months',   -- application_date
        NULL,                          -- cancellation_date
        20.00                          -- payment (below price example)
    ),
    (
        admin_profile_id,              -- profile_id: Admin
        event_id_completed_1,          -- event_id: Completed *** USING COMPLETED EVENT ***
        TRUE,                          -- user_applied_status: Applied by user
        'attended',                    -- process_status: Attended
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        NULL                           -- payment (or lookup price and set paid value)
    ),
    (
        admin_profile_id,              -- profile_id: Admin
        event_id_cancelled_1,          -- event_id: Cancelled
        FALSE,                         -- user_applied_status: Added by admin
        'cancelled_by_admin',          -- process_status: Cancelled by admin
        now() - interval '3 months',   -- application_date
        now() - interval '1 month',    -- cancellation_date
        NULL                           -- payment
    ),

    -- User1's Participations (Example Scenarios)
    (
        user1_profile_id,              -- profile_id: User1
        event_id_reg_open_1,           -- event_id: Registration Open (same event as admin example)
        TRUE,                          -- user_applied_status: Applied by user
        'applied',                     -- process_status: Applied (not yet confirmed)
        now() - interval '1 day',      -- application_date
        NULL,                          -- cancellation_date
        NULL                           -- payment (not paid yet)
    ),
    (
        user1_profile_id,              -- profile_id: User1
        event_id_reg_closed_1,         -- event_id: Registration Closed
        TRUE,                          -- user_applied_status: Applied by user
        'confirmed',                   -- process_status: Confirmed
        now() - interval '1 month',    -- application_date
        NULL,                          -- cancellation_date
        15.00                          -- payment (matches price example)
    ),
     (
        user1_profile_id,              -- profile_id: User1
        event_id_scheduled_1,          -- event_id: Scheduled Event 1
        FALSE,                         -- user_applied_status: Added by admin
        'applied',                     -- process_status: Applied
        now() - interval '1 week',     -- application_date
        NULL,                          -- cancellation_date
        NULL                           -- payment
    ),


    -- User2's Participations (Example Scenario - Less data)
    (
        user2_profile_id,              -- profile_id: User2
        event_id_reg_open_1,           -- event_id: Registration Open (another participation in this event)
        TRUE,                          -- user_applied_status: Applied by user
        'applied',                     -- process_status: Applied
        now() - interval '2 days',     -- application_date
        NULL,                          -- cancellation_date
        NULL                           -- payment
    );

    -- Add more blocks to the VALUES clause for other users or more participations
    -- Example for user3 in Completed event:
    -- (
    --     (SELECT p.id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user3@example.com'), -- Look up user3's profile ID
    --     event_id_completed_1, -- Link to the completed event
    --     TRUE,
    --     'attended',
    --     now() - interval '2 months',
    --     NULL,
    --     (SELECT ticket_price FROM public.events WHERE id = event_id_completed_1) -- Lookup price for this event
    -- )


END $$; -- End of DO block

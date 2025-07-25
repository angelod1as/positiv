-- supabase/seed/04_event_participants.sql

-- Clear existing data from the public.event_participants table
TRUNCATE public.event_participants CASCADE;

-- Use a DO block to handle variables and a single atomic insert
DO $$
DECLARE
    -- Declare variables for specific profile IDs (based on email)
    admin_profile_id uuid;
    user1_profile_id uuid;
    user2_profile_id uuid;
    user3_profile_id uuid;
    user4_profile_id uuid;
    user5_profile_id uuid;
    user6_profile_id uuid;
    user7_profile_id uuid;
    user8_profile_id uuid;
    user9_profile_id uuid;

    -- Declare variables for specific event IDs (based on title or status+index)
    event_id_reg_open_1 uuid;
    event_id_reg_closed_1 uuid;
    event_id_cancelled_1 uuid;
    event_id_completed_1 uuid;
    event_id_scheduled_1 uuid;

BEGIN
    -- Retrieve specific profile IDs based on user emails (from 01_auth.sql)
    SELECT p.id INTO admin_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'admin@example.com';
    SELECT p.id INTO user1_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user1@example.com';
    SELECT p.id INTO user2_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user2@example.com';
    SELECT p.id INTO user3_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user3@example.com';
    SELECT p.id INTO user4_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user4@example.com';
    SELECT p.id INTO user5_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user5@example.com';
    SELECT p.id INTO user6_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user6@example.com';
    SELECT p.id INTO user7_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user7@example.com';
    SELECT p.id INTO user8_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user8@example.com';
    SELECT p.id INTO user9_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user9@example.com';

    -- Retrieve specific event IDs based on titles or statuses (from 03_events.sql)
    SELECT id INTO event_id_reg_open_1   FROM public.events WHERE title = 'Evento Com Inscrições Abertas 1';
    SELECT id INTO event_id_reg_closed_1 FROM public.events WHERE title = 'Evento Com Inscrições Fechadas 1';
    SELECT id INTO event_id_cancelled_1  FROM public.events WHERE title = 'Evento Cancelado 2';
    SELECT id INTO event_id_completed_1  FROM public.events WHERE title = 'Evento Concluído 1';
    SELECT id INTO event_id_scheduled_1  FROM public.events WHERE title = 'Evento Agendado 1';

    -- ### Seed public.event_participants ###
    -- Insert specific participation records using the retrieved IDs

    INSERT INTO public.event_participants (
        profile_id,
        event_id,
        is_user_applied,
        application_status,
        attendance_status,
        has_paid,
        application_date,
        cancellation_date,
        payment,
        notes,
        spot_type,
        admin_general_notes,
        flag,
        flag_notes
    )
    VALUES
    -- Admin's Participations (Example Scenarios)
    (
        admin_profile_id,              -- profile_id: Admin
        event_id_reg_open_1,           -- event_id: Registration Open
        TRUE,                          -- is_user_applied: Applied by user
        'sent_payment_data',           -- application_status
        'pending',
        TRUE,                          -- has_paid
        now() - interval '2 months',   -- application_date
        NULL,                          -- cancellation_date
        20.00,                         -- payment (below price example)
        'Admin paid for this participation', -- notes
        'staff',                       -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),
    (
        admin_profile_id,              -- profile_id: Admin
        event_id_completed_1,          -- event_id: Completed
        TRUE,                          -- is_user_applied: Applied by user
        'finalised',                   -- application_status (from old 'attended')
        'attended',                    -- attendance_status (from old 'attended')
        TRUE,                          -- has_paid (from old 'attended')
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        NULL,                          -- notes
        'staff',                       -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),
    (
        admin_profile_id,              -- profile_id: Admin
        event_id_cancelled_1,          -- event_id: Cancelled
        FALSE,                         -- is_user_applied: Added by admin
        'finalised',                   -- application_status
        'pending',
        FALSE,                         -- has_paid
        now() - interval '3 months',   -- application_date
        now() - interval '1 month',    -- cancellation_date
        0,                             -- payment
        'Event was cancelled, so attendance is just pending', -- notes
        'staff',                       -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),

    -- User1's Participations (Example Scenarios)
    (
        user1_profile_id,              -- profile_id: User1
        event_id_reg_open_1,           -- event_id: Registration Open (current event)
        TRUE,                          -- is_user_applied: Applied by user
        'pending',                     -- application_status
        'pending',
        FALSE,                         -- has_paid
        now() - interval '1 day',      -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment (not paid yet)
        NULL,                          -- notes
        'staff',                       -- spot_type
        NULL,                          -- admin_general_notes
        'yellow',                      -- flag
        'Usuário novo, acompanhar comportamento' -- flag_notes
    ),
    (
        user1_profile_id,              -- profile_id: User1
        event_id_completed_1,          -- event_id: Completed (previous event - was SKIPPED!)
        TRUE,                          -- is_user_applied: Applied by user
        'finalised',                   -- application_status (from old 'skipped')
        'skipped',                     -- attendance_status (from old 'skipped')
        FALSE,                         -- has_paid (from old 'skipped')
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        NULL,
        'staff',                       -- spot_type
        'Admin notes here... why skipped and all...', -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),
    (
        user1_profile_id,              -- profile_id: User1
        event_id_reg_closed_1,         -- event_id: Registration Closed
        TRUE,                          -- is_user_applied: Applied by user
        'sent_payment_data',           -- application_status
        'pending',
        TRUE,                          -- has_paid
        now() - interval '1 month',    -- application_date
        NULL,                          -- cancellation_date
        15.00,                         -- payment (matches price example)
        'User paid for this closed event', -- notes
        'staff',                       -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),

    -- User2's Participations (Testing multiple skips)
    (
        user2_profile_id,              -- profile_id: User2
        event_id_reg_open_1,           -- event_id: Registration Open (current event)
        TRUE,                          -- is_user_applied: Applied by user
        'talking',                     -- application_status (from old 'talking')
        'pending',
        FALSE,                         -- has_paid (from old 'talking')
        now() - interval '2 days',     -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        'Admin talking to user about participation', -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'red',                         -- flag
        'Histórico de faltas sem aviso' -- flag_notes
    ),
    (
        user2_profile_id,              -- profile_id: User2
        event_id_completed_1,          -- event_id: Completed (most recent previous - SKIPPED)
        TRUE,                          -- is_user_applied: Applied by user
        'finalised',                   -- application_status (from old 'skipped')
        'skipped',                     -- attendance_status (from old 'skipped')
        FALSE,                         -- has_paid (from old 'skipped')
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        'Admin decision: behavioral concerns', -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'red',                         -- flag
        'Comportamento inadequado em eventos anteriores' -- flag_notes
    ),
    (
        user2_profile_id,              -- profile_id: User2
        event_id_scheduled_1,          -- event_id: Scheduled (even older event - also SKIPPED)
        TRUE,                          -- is_user_applied: Applied by user
        'finalised',                   -- application_status (from old 'skipped')
        'skipped',                     -- attendance_status (from old 'skipped')
        FALSE,                         -- has_paid (from old 'skipped')
        now() - interval '6 months',   -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        'Admin decision: no-show history', -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'red',                         -- flag
        'Múltiplas faltas sem aviso prévio' -- flag_notes
    ),

    -- User3's Participations (Control case - good participant)
    (
        user3_profile_id,              -- profile_id: User3
        event_id_reg_open_1,           -- event_id: Registration Open (current event)
        TRUE,                          -- is_user_applied: Applied by user
        'sent_payment_data',           -- application_status (from old 'sent_payment_data')
        'pending',
        FALSE,                         -- has_paid (from old 'sent_payment_data')
        now() - interval '3 days',     -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        'User sent payment details',   -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),
    (
        user3_profile_id,              -- profile_id: User3
        event_id_completed_1,          -- event_id: Completed (previous event - ATTENDED)
        TRUE,                          -- is_user_applied: Applied by user
        'finalised',                   -- application_status (from old 'attended')
        'attended',                    -- attendance_status (from old 'attended')
        TRUE,                          -- has_paid (from old 'attended')
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        25.00,                         -- payment
        'Great participant!',          -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),
    (
        user3_profile_id,              -- profile_id: User3
        event_id_scheduled_1,          -- event_id: Scheduled (older event - also ATTENDED)
        TRUE,                          -- is_user_applied: Applied by user
        'finalised',                   -- application_status (from old 'attended')
        'attended',                    -- attendance_status (from old 'attended')
        TRUE,                          -- has_paid (from old 'attended')
        now() - interval '6 months',   -- application_date
        NULL,                          -- cancellation_date
        20.00,                         -- payment
        NULL,                          -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),

    -- User4's Participations (New scenarios for 'not-attended', 'rejected', 'will-not-go')
    (
        user4_profile_id,              -- profile_id: User4
        event_id_reg_open_1,           -- event_id: Registration Open (current event)
        TRUE,                          -- is_user_applied: Applied by user
        'think_better',                -- application_status (from old 'think_better')
        'pending',
        FALSE,                         -- has_paid (from old 'think_better')
        now() - interval '5 days',     -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        'User considering participation', -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),
    (
        user4_profile_id,              -- profile_id: User4
        event_id_completed_1,          -- event_id: Completed (previous event - not-attended)
        TRUE,                          -- is_user_applied: Applied by user
        'finalised',                   -- application_status (from old 'not-attended')
        'not-attended',                -- attendance_status (from old 'not-attended')
        TRUE,                          -- has_paid (from old 'not-attended')
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        'User applied but did not show up', -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'yellow',                      -- flag
        'Faltou ao último evento sem aviso' -- flag_notes
    ),
    (
        user4_profile_id,              -- profile_id: User4
        event_id_reg_closed_1,         -- event_id: Registration Closed (rejected)
        TRUE,                          -- is_user_applied: Applied by user
        'finalised',                   -- application_status
        'pending',
        FALSE,                         -- has_paid
        now() - interval '2 months',   -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        'Application rejected, so attendance is just pending', -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),
    (
        user4_profile_id,              -- profile_id: User4
        event_id_scheduled_1,          -- event_id: Scheduled (sent_rules example)
        TRUE,                          -- is_user_applied: Applied by user
        'sent_rules',                  -- application_status (from old 'sent_rules')
        'pending',
        TRUE,                          -- has_paid (from old 'sent_rules')
        now() - interval '7 months',   -- application_date
        NULL,                          -- cancellation_date
        0,                             -- payment
        'Admin sent participation rules to user', -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    ),
    -- New entry to demonstrate 'will-not-go' attendance status
    (
        user4_profile_id,              -- profile_id: User4
        event_id_cancelled_1,          -- event_id: Using an existing cancelled event for this example
        TRUE,                          -- is_user_applied: Applied by user
        'finalised',                   -- application_status
        'will-not-go',                 -- attendance_status: New value demonstration
        FALSE,                         -- has_paid
        now() - interval '1 month',    -- application_date
        now() - interval '15 days',    -- cancellation_date (user decided not to go)
        0,                             -- payment
        'User decided they will not go to the event.', -- notes
        'regular',                     -- spot_type
        NULL,                          -- admin_general_notes
        'none',                        -- flag
        NULL                           -- flag_notes
    );

    -- Summary of test scenarios created:
    -- 1. Admin: Example of 'paid', 'attended', and 'cancelled' event scenarios.
    -- 2. User1: Applied to current event, 'skipped' from a previous, and 'paid' for another.
    -- 3. User2: 'talking' for current, 'skipped' from two previous events.
    -- 4. User3: 'sent_payment_data' for current, 'attended' two previous events.
    -- 5. User4: 'think_better' for current, 'not-attended' a previous, 'cancelled' from another, 'sent_rules' for an older event, and a new entry for 'will-not-go'.
    -- NOTE: 'rejected' was removed from the attendance_status enum and is now covered by the approval flow.

END $$;

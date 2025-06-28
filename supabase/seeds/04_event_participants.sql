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
    user3_profile_id uuid; -- Added for skipped scenarios
    user4_profile_id uuid; -- New: For "not-attended" and "rejected" scenarios

    -- Declare variables for specific event IDs (based on title or status+index)
    event_id_reg_open_1 uuid;
    event_id_reg_closed_1 uuid;
    event_id_cancelled_1 uuid;
    event_id_completed_1 uuid; -- Use this one for the 'attended' scenario
    event_id_scheduled_1 uuid;

BEGIN
    -- Retrieve specific profile IDs based on user emails (from 01_auth.sql)
    SELECT p.id INTO admin_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'admin@example.com';
    SELECT p.id INTO user1_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user1@example.com';
    SELECT p.id INTO user2_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user2@example.com';
    SELECT p.id INTO user3_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user3@example.com';
    SELECT p.id INTO user4_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user4@example.com'; -- New user for new statuses

    -- Retrieve specific event IDs based on titles or statuses (from 03_events.sql)
    SELECT id INTO event_id_reg_open_1   FROM public.events WHERE title = 'Evento Com Inscrições Abertas 1';
    SELECT id INTO event_id_reg_closed_1 FROM public.events WHERE title = 'Evento Com Inscrições Fechadas 1';
    SELECT id INTO event_id_cancelled_1  FROM public.events WHERE title = 'Evento Cancelado 2';
    SELECT id INTO event_id_completed_1  FROM public.events WHERE title = 'Evento Concluído 1';
    SELECT id INTO event_id_scheduled_1  FROM public.events WHERE title = 'Evento Agendado 1';

    -- ### Seed public.event_participants ###
    -- Insert specific participation records using the retrieved IDs

    INSERT INTO public.event_participants (profile_id, event_id, is_user_applied, process_status, application_date, cancellation_date, payment, notes)
    VALUES
    -- Admin's Participations (Example Scenarios)
    (
        admin_profile_id,              -- profile_id: Admin
        event_id_reg_open_1,           -- event_id: Registration Open
        TRUE,                          -- is_user_applied: Applied by user
        'paid',                        -- process_status: Paid (replaces 'confirmed')
        now() - interval '2 months',   -- application_date
        NULL,                          -- cancellation_date
        20.00,                         -- payment (below price example)
        'Admin paid for this participation' -- notes
    ),
    (
        admin_profile_id,              -- profile_id: Admin
        event_id_completed_1,          -- event_id: Completed
        TRUE,                          -- is_user_applied: Applied by user
        'attended',                    -- process_status: Attended
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment
        NULL                           -- notes
    ),
    (
        admin_profile_id,              -- profile_id: Admin
        event_id_cancelled_1,          -- event_id: Cancelled (now 'rejected' as per new types)
        FALSE,                         -- is_user_applied: Added by admin
        'rejected',                    -- process_status: Rejected (replaces 'cancelled_by_admin')
        now() - interval '3 months',   -- application_date
        now() - interval '1 month',    -- cancellation_date
        NULL,                          -- payment
        'Rejected by admin due to event cancellation' -- notes
    ),

    -- User1's Participations (Example Scenarios)
    (
        user1_profile_id,              -- profile_id: User1
        event_id_reg_open_1,           -- event_id: Registration Open (current event)
        TRUE,                          -- is_user_applied: Applied by user
        'applied',                     -- process_status: Applied (not yet confirmed)
        now() - interval '1 day',      -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment (not paid yet)
        NULL                           -- notes
    ),
    (
        user1_profile_id,              -- profile_id: User1
        event_id_completed_1,          -- event_id: Completed (previous event - was SKIPPED!)
        TRUE,                          -- is_user_applied: Applied by user
        'skipped',                     -- process_status: SKIPPED BY ADMIN
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment (no payment since skipped)
        'Admin decision: capacity issues' -- notes explaining why skipped
    ),
    (
        user1_profile_id,              -- profile_id: User1
        event_id_reg_closed_1,         -- event_id: Registration Closed
        TRUE,                          -- is_user_applied: Applied by user
        'paid',                        -- process_status: Paid (replaces 'confirmed')
        now() - interval '1 month',    -- application_date
        NULL,                          -- cancellation_date
        15.00,                         -- payment (matches price example)
        'User paid for this closed event' -- notes
    ),

    -- User2's Participations (Testing multiple skips)
    (
        user2_profile_id,              -- profile_id: User2
        event_id_reg_open_1,           -- event_id: Registration Open (current event)
        TRUE,                          -- is_user_applied: Applied by user
        'talking',                     -- process_status: Talking (new status)
        now() - interval '2 days',     -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment
        'Admin talking to user about participation' -- notes
    ),
    (
        user2_profile_id,              -- profile_id: User2
        event_id_completed_1,          -- event_id: Completed (most recent previous - SKIPPED)
        TRUE,                          -- is_user_applied: Applied by user
        'skipped',                     -- process_status: SKIPPED BY ADMIN
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment
        'Admin decision: behavioral concerns' -- notes
    ),
    (
        user2_profile_id,              -- profile_id: User2
        event_id_scheduled_1,          -- event_id: Scheduled (even older event - also SKIPPED)
        TRUE,                          -- is_user_applied: Applied by user
        'skipped',                     -- process_status: SKIPPED BY ADMIN
        now() - interval '6 months',   -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment
        'Admin decision: no-show history' -- notes
    ),

    -- User3's Participations (Control case - good participant)
    (
        user3_profile_id,              -- profile_id: User3
        event_id_reg_open_1,           -- event_id: Registration Open (current event)
        TRUE,                          -- is_user_applied: Applied by user
        'sent_payment_data',           -- process_status: Sent Payment Data (new status)
        now() - interval '3 days',     -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment
        'User sent payment details'    -- notes
    ),
    (
        user3_profile_id,              -- profile_id: User3
        event_id_completed_1,          -- event_id: Completed (previous event - ATTENDED)
        TRUE,                          -- is_user_applied: Applied by user
        'attended',                    -- process_status: ATTENDED (good participant)
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        25.00,                         -- payment
        'Great participant!'           -- notes
    ),
    (
        user3_profile_id,              -- profile_id: User3
        event_id_scheduled_1,          -- event_id: Scheduled (older event - also ATTENDED)
        TRUE,                          -- is_user_applied: Applied by user
        'attended',                    -- process_status: ATTENDED
        now() - interval '6 months',   -- application_date
        NULL,                          -- cancellation_date
        20.00,                         -- payment
        NULL                           -- notes
    ),

    -- User4's Participations (New scenarios for 'not-attended' and 'rejected')
    (
        user4_profile_id,              -- profile_id: User4
        event_id_reg_open_1,           -- event_id: Registration Open (current event)
        TRUE,                          -- is_user_applied: Applied by user
        'think_better',                -- process_status: Think Better (new status)
        now() - interval '5 days',     -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment
        'User considering participation' -- notes
    ),
    (
        user4_profile_id,              -- profile_id: User4
        event_id_completed_1,          -- event_id: Completed (previous event - not-attended)
        TRUE,                          -- is_user_applied: Applied by user
        'not-attended',                -- process_status: Not Attended (new status)
        now() - interval '4 months',   -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment
        'User applied but did not show up' -- notes
    ),
    (
        user4_profile_id,              -- profile_id: User4
        event_id_reg_closed_1,         -- event_id: Registration Closed (rejected)
        TRUE,                          -- is_user_applied: Applied by user
        'rejected',                    -- process_status: Rejected (new status)
        now() - interval '2 months',   -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment
        'Application rejected by admin due to criteria mismatch' -- notes
    ),
    (
        user4_profile_id,              -- profile_id: User4
        event_id_scheduled_1,          -- event_id: Scheduled (sent_rules example)
        TRUE,                          -- is_user_applied: Applied by user
        'sent_rules',                  -- process_status: Sent Rules (new status)
        now() - interval '7 months',   -- application_date
        NULL,                          -- cancellation_date
        NULL,                          -- payment
        'Admin sent participation rules to user' -- notes
    );

    -- Summary of test scenarios created:
    -- 1. Admin: Example of 'paid', 'attended', and 'rejected' statuses.
    -- 2. User1: Applied to current event, 'skipped' from a previous, and 'paid' for another.
    -- 3. User2: 'talking' for current, 'skipped' from two previous events.
    -- 4. User3: 'sent_payment_data' for current, 'attended' two previous events.
    -- 5. User4 (New): 'think_better' for current, 'not-attended' a previous, 'rejected' from another, and 'sent_rules' for an older event.

END $$;

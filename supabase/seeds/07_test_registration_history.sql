-- supabase/seed/07_test_registration_history.sql
-- Test case for POS-238: Registration history should show ALL registrations
-- This creates a non-veteran user with various registration types to test the history display

DO $$
DECLARE
    test_user_id uuid;
    test_profile_id uuid;
    event_id_reg_open_1 uuid;
    event_id_completed_1 uuid;
    event_id_scheduled_1 uuid;
BEGIN
    -- Create a test user who is NOT a veteran but has multiple registrations
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    VALUES (
        gen_random_uuid(),
        'test-history@example.com',
        '$2a$10$PUJ/OBGFGh2GLSxT6w25Wu/I9KmxQ0eFIFBxQ0gNR0wKLQRMgT0X2', -- password123 encrypted
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}'
    )
    RETURNING id INTO test_user_id;

    -- Create profile for the test user (NOT a veteran)
    INSERT INTO public.profiles (
        user_id,
        full_name,
        social_name,
        date_of_birth,
        email,
        cpf,
        phone,
        gender,
        pronouns,
        is_veteran,  -- FALSE to test non-veteran history display
        approved_to_attend,
        basic_data_filled
    )
    VALUES (
        test_user_id,
        'Test History User',
        'Test',
        '1990-01-15',
        'test-history@example.com',
        '12345678915',
        5511987654329,
        ARRAY['Pessoa agênera']::text[],
        ARRAY['elu/delu']::text[],
        FALSE,  -- NOT a veteran
        'approved',
        TRUE
    )
    RETURNING id INTO test_profile_id;

    -- Get existing event IDs
    SELECT id INTO event_id_reg_open_1 FROM public.events WHERE title = 'Evento Com Inscrições Abertas 1';
    SELECT id INTO event_id_completed_1 FROM public.events WHERE title = 'Evento Concluído 1';
    SELECT id INTO event_id_scheduled_1 FROM public.events WHERE title = 'Evento Agendado 1';

    -- Insert various types of registrations for this user
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
        admin_general_notes
    )
    VALUES
    -- Current event: User applied themselves
    (
        test_profile_id,
        event_id_reg_open_1,
        TRUE,  -- User applied
        'finalised',
        'pending',
        TRUE,
        now() - interval '5 days',
        NULL,
        25.00,
        'Applied for current event',
        'regular',
        'Waiting for event to happen'
    ),
    -- Previous event: Admin added them (is_user_applied = FALSE)
    (
        test_profile_id,
        event_id_completed_1,
        FALSE,  -- ADMIN ADDED - This should still show in history!
        'finalised',
        'attended',
        TRUE,
        now() - interval '4 months',
        NULL,
        0,
        'Admin added this person directly to the event',
        'staff',
        'Admin added as staff member'
    ),
    -- Older event: User applied but didn't attend (no-show)
    (
        test_profile_id,
        event_id_scheduled_1,
        TRUE,  -- User applied
        'finalised',
        'not-attended',  -- NO-SHOW - This should still show in history!
        TRUE,
        now() - interval '6 months',
        NULL,
        30.00,
        'User was a no-show',
        'regular',
        'Did not attend despite confirming'
    );

    -- Log what we created for verification
    RAISE NOTICE 'Created test user: test-history@example.com (not a veteran)';
    RAISE NOTICE 'Profile ID: %', test_profile_id;
    RAISE NOTICE 'Added 3 registrations:';
    RAISE NOTICE '  1. Current event (user-applied, pending)';
    RAISE NOTICE '  2. Previous event (admin-added, attended)';
    RAISE NOTICE '  3. Older event (user-applied, no-show)';
END $$;
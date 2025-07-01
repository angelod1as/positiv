-- supabase/seed/06_event_participants_completed_event.sql
-- Adds all remaining users as participants in 'Evento Concluído 1' (Completed event)
-- Most will have status 'attended', a few with other statuses. No duplicates.

DO $$
DECLARE
    -- Profile IDs for users not already in the completed event
    user4_profile_id uuid;
    user5_profile_id uuid;
    user6_profile_id uuid;
    user7_profile_id uuid;
    user8_profile_id uuid;
    user9_profile_id uuid;
    event_id_completed_1 uuid;
BEGIN
    -- Get profile IDs for users 4-9
    SELECT p.id INTO user4_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user4@example.com';
    SELECT p.id INTO user5_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user5@example.com';
    SELECT p.id INTO user6_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user6@example.com';
    SELECT p.id INTO user7_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user7@example.com';
    SELECT p.id INTO user8_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user8@example.com';
    SELECT p.id INTO user9_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user9@example.com';
    -- Get event ID for 'Evento Concluído 1'
    SELECT id INTO event_id_completed_1 FROM public.events WHERE title = 'Evento Concluído 1';

    -- Insert new participations (no duplicates)
    INSERT INTO public.event_participants (
        profile_id,
        event_id,
        is_user_applied,
        application_status,   -- New column
        attendance_status,    -- New column
        has_paid,             -- New column
        application_date,
        cancellation_date,
        payment,
        notes
    )
    VALUES
        (user4_profile_id, event_id_completed_1, TRUE,  'finalised', 'attended', TRUE, now() - interval '4 months', NULL, 50.00, 'Attended successfully'),
        (user5_profile_id, event_id_completed_1, TRUE,  'finalised', 'attended', TRUE, now() - interval '4 months', NULL, 50.00, 'Attended successfully'),
        (user6_profile_id, event_id_completed_1, TRUE,  'finalised', 'attended', TRUE, now() - interval '4 months', NULL, 50.00, 'Attended successfully'),
        -- 'confirmed' implies payment but not attendance, so application_status 'sent_payment_data' and attendance_status 'pending'
        (user7_profile_id, event_id_completed_1, TRUE,  'sent_payment_data', 'pending', TRUE, now() - interval '4 months', NULL, 50.00, 'Confirmed but did not show up'),
        (user8_profile_id, event_id_completed_1, TRUE,  'finalised', 'skipped', FALSE, now() - interval '4 months', NULL, 0, 'Skipped by admin'),
        (user9_profile_id, event_id_completed_1, TRUE,  'finalised', 'attended', TRUE, now() - interval '4 months', NULL, 50.00, 'Attended successfully');
END $$;

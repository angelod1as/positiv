-- supabase/seed/05_event_reminders.sql

-- Add mock event reminders for user2

DO $$
DECLARE
    user1_profile_id uuid;
    user2_profile_id uuid;
    user3_profile_id uuid;
    user4_profile_id uuid;
    user5_profile_id uuid;
    user6_profile_id uuid;
    user7_profile_id uuid;
    user8_profile_id uuid;
    user9_profile_id uuid;
    event_id_scheduled_1 uuid;
    event_id_reg_open_1 uuid;
    event_id_reg_open_2 uuid;
    event_id_completed_1 uuid;
    event_id_reg_closed_1 uuid;
BEGIN
    -- Retrieve user profile IDs
    SELECT p.id INTO user1_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user1@example.com';
    SELECT p.id INTO user2_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user2@example.com';
    SELECT p.id INTO user3_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user3@example.com';
    SELECT p.id INTO user4_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user4@example.com';
    SELECT p.id INTO user5_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user5@example.com';
    SELECT p.id INTO user6_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user6@example.com';
    SELECT p.id INTO user7_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user7@example.com';
    SELECT p.id INTO user8_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user8@example.com';
    SELECT p.id INTO user9_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user9@example.com';
    -- Retrieve event IDs
    SELECT id INTO event_id_scheduled_1 FROM public.events WHERE title = 'Evento Agendado 1';
    SELECT id INTO event_id_reg_open_1 FROM public.events WHERE title = 'Evento Com Inscrições Abertas 1';
    SELECT id INTO event_id_reg_open_2 FROM public.events WHERE title = 'Evento Com Inscrições Abertas 2';
    SELECT id INTO event_id_completed_1 FROM public.events WHERE title = 'Evento Concluído 1';
    SELECT id INTO event_id_reg_closed_1 FROM public.events WHERE title = 'Evento Com Inscrições Fechadas 1';

    -- Reminder TRUE for a Scheduled event (reminder = row exists, email_sent = false)
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_scheduled_1, user2_profile_id, false);

    -- Reminder FALSE for a Completed event (simulate opt-out, email_sent = false)
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_completed_1, user2_profile_id, false);

    -- Reminder TRUE for a Registration Open event and with the email sent FALSE
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_open_1, user2_profile_id, false);
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_open_1, user1_profile_id, false);
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_open_1, user3_profile_id, false);
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_open_1, user4_profile_id, false);
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_open_1, user5_profile_id, false);
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_open_1, user6_profile_id, false);
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_open_1, user7_profile_id, false);
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_open_1, user8_profile_id, false);
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_open_1, user9_profile_id, false);

    -- Reminder TRUE for a Registration Open event and with the email sent TRUE (and a fake date)
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent, email_sent_date)
    VALUES (event_id_reg_open_2, user2_profile_id, true, '2024-06-01T10:00:00Z');

    -- Reminder TRUE for a Registration Closed event (email_sent = false)
    INSERT INTO public.event_reminders (event_id, profile_id, email_sent)
    VALUES (event_id_reg_closed_1, user2_profile_id, false);

END $$;

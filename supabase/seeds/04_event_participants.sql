-- supabase/seed/04_event_participants.sql

-- This script generates realistic event participation data with bell curve distribution:
-- Completed events: 60-80 participants (mostly attended)
-- Registration Open: 30-50 participants (various application statuses)
-- Registration Closed: 50-70 participants (mostly finalised)
-- Scheduled: 10-20 participants (early registrations)
-- Cancelled: 15-25 participants (frozen at various statuses)

TRUNCATE public.event_participants CASCADE;

-- ============================================================================
-- PART A: Deterministic participants for first 10 users (test stability)
-- ============================================================================

DO $$
DECLARE
    admin_profile_id uuid;
    user1_profile_id uuid;
    user2_profile_id uuid;
    user3_profile_id uuid;
    user4_profile_id uuid;
    event_id_reg_open_1 uuid;
    event_id_reg_closed_1 uuid;
    event_id_cancelled_1 uuid;
    event_id_completed_1 uuid;
    event_id_scheduled_1 uuid;
BEGIN
    SELECT p.id INTO admin_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'admin@example.com';
    SELECT p.id INTO user1_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user1@example.com';
    SELECT p.id INTO user2_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user2@example.com';
    SELECT p.id INTO user3_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user3@example.com';
    SELECT p.id INTO user4_profile_id FROM public.profiles p JOIN auth.users u ON p.user_id = u.id WHERE u.email = 'user4@example.com';

    SELECT id INTO event_id_reg_open_1 FROM public.events WHERE title = 'Evento Com Inscricoes Abertas 1';
    SELECT id INTO event_id_reg_closed_1 FROM public.events WHERE title LIKE 'Evento Com Inscricoes Fechadas 1%' LIMIT 1;
    SELECT id INTO event_id_cancelled_1 FROM public.events WHERE title = 'Evento Cancelado 1';
    SELECT id INTO event_id_completed_1 FROM public.events WHERE title = 'Evento Concluido 1';
    SELECT id INTO event_id_scheduled_1 FROM public.events WHERE title = 'Evento Agendado 1';

    INSERT INTO public.event_participants (
        profile_id, event_id, is_user_applied, application_status, attendance_status,
        has_paid, application_date, cancellation_date, payment, notes,
        referrals, referred, companions, bond, spot_type, admin_general_notes
    )
    VALUES
    (admin_profile_id, event_id_reg_open_1, TRUE, 'sent_payment_data', 'pending', TRUE, now() - interval '2 months', NULL, 20.00, 'Admin paid for this participation', NULL, 'Joao Silva - indicacao formal', NULL, 'Posso ir sozinhe.', 'staff', NULL),
    (admin_profile_id, event_id_completed_1, TRUE, 'finalised', 'attended', TRUE, now() - interval '4 months', NULL, 0, NULL, NULL, 'ninguem', NULL, NULL, 'staff', NULL),
    (admin_profile_id, event_id_cancelled_1, FALSE, 'finalised', 'pending', FALSE, now() - interval '3 months', now() - interval '1 month', 0, 'Event was cancelled', NULL, 'Joao Silva - indicacao formal', NULL, NULL, 'staff', NULL),
    (user1_profile_id, event_id_reg_open_1, TRUE, 'pending', 'pending', FALSE, now() - interval '1 day', NULL, 0, NULL, NULL, 'ninguem', NULL, NULL, 'staff', NULL),
    (user1_profile_id, event_id_completed_1, TRUE, 'finalised', 'skipped', FALSE, now() - interval '4 months', NULL, 0, NULL, NULL, 'ninguem', NULL, NULL, 'staff', 'Admin notes here... why skipped and all...'),
    (user1_profile_id, event_id_reg_closed_1, TRUE, 'sent_payment_data', 'pending', TRUE, now() - interval '1 month', NULL, 15.00, 'User paid for this closed event', NULL, 'ninguem', NULL, NULL, 'staff', NULL),
    (user2_profile_id, event_id_reg_open_1, TRUE, 'talking', 'pending', FALSE, now() - interval '2 days', NULL, 0, 'Admin talking to user about participation', NULL, 'Maria Santos - mesa de bar', NULL, NULL, 'regular', NULL),
    (user2_profile_id, event_id_completed_1, TRUE, 'finalised', 'skipped', FALSE, now() - interval '4 months', NULL, 0, 'Admin decision: behavioral concerns', NULL, 'Carlos Oliveira - indicacao formal', NULL, NULL, 'regular', NULL),
    (user2_profile_id, event_id_scheduled_1, TRUE, 'finalised', 'skipped', FALSE, now() - interval '6 months', NULL, 0, 'Admin decision: no-show history', NULL, 'ninguem', 'Vou com meu melhor amigo', NULL, 'regular', NULL),
    (user3_profile_id, event_id_reg_open_1, TRUE, 'sent_payment_data', 'pending', FALSE, now() - interval '3 days', NULL, 0, 'User sent payment details', NULL, 'Ana Costa - indicacao casual', NULL, NULL, 'regular', NULL),
    (user3_profile_id, event_id_completed_1, TRUE, 'finalised', 'attended', TRUE, now() - interval '4 months', NULL, 25.00, 'Great participant!', NULL, 'ninguem', NULL, NULL, 'regular', NULL),
    (user3_profile_id, event_id_scheduled_1, TRUE, 'finalised', 'attended', TRUE, now() - interval '6 months', NULL, 20.00, NULL, NULL, 'ninguem', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_reg_open_1, TRUE, 'think_better', 'pending', FALSE, now() - interval '5 days', NULL, 0, 'User considering participation', NULL, 'Pedro Alves - indicacao formal', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_completed_1, TRUE, 'finalised', 'not-attended', TRUE, now() - interval '4 months', NULL, 0, 'User applied but did not show up', NULL, 'ninguem', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_reg_closed_1, TRUE, 'finalised', 'pending', FALSE, now() - interval '2 months', NULL, 0, 'Application finalized', NULL, 'Beatriz Lima - evento anterior', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_scheduled_1, TRUE, 'sent_rules', 'pending', TRUE, now() - interval '7 months', NULL, 0, 'Admin sent participation rules to user', NULL, 'ninguem', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_cancelled_1, TRUE, 'finalised', 'will-not-go', FALSE, now() - interval '1 month', now() - interval '15 days', 0, 'User decided they will not go', NULL, 'ninguem', NULL, NULL, 'regular', NULL);
END $$;

-- ============================================================================
-- PART B: Generated participants for completed events (60-80 per event)
-- ============================================================================

DO $$
DECLARE
    event_rec RECORD;
    participant_count int;
BEGIN
    FOR event_rec IN
        SELECT id, title FROM public.events WHERE event_status = 'Completed'
    LOOP
        participant_count := 60 + floor(random() * 21)::int;

        INSERT INTO public.event_participants (
            profile_id, event_id, is_user_applied, application_status, attendance_status,
            has_paid, application_date, payment, notes, referred, spot_type, admin_general_notes
        )
        SELECT
            p.id,
            event_rec.id,
            random() < 0.90,
            'finalised'::application_status_enum,
            CASE
                WHEN random() < 0.80 THEN 'attended'
                WHEN random() < 0.88 THEN 'not-attended'
                WHEN random() < 0.93 THEN 'skipped'
                WHEN random() < 0.98 THEN 'will-not-go'
                ELSE 'pending'
            END::attendance_status_enum,
            random() < 0.95,
            now() - interval '4 months' - (random() * interval '30 days'),
            (random() * 100)::numeric(10,2),
            CASE WHEN random() < 0.20 THEN 'Participante gerado automaticamente' ELSE null END,
            (ARRAY['Indicacao de amigo', 'Evento anterior', 'Redes sociais', 'Instagram', 'ninguem'])[floor(random() * 5 + 1)::int],
            CASE
                WHEN random() < 0.85 THEN 'regular'
                WHEN random() < 0.95 THEN 'social'
                ELSE 'staff'
            END::public.spot_type,
            CASE WHEN random() < 0.10 THEN 'Nota administrativa sobre participante' ELSE null END
        FROM public.profiles p
        WHERE p.approved_to_attend IN ('approved', 'approved_with_reservations')
          AND p.id NOT IN (
              SELECT ep.profile_id FROM public.event_participants ep WHERE ep.event_id = event_rec.id
          )
        ORDER BY random()
        LIMIT participant_count;
    END LOOP;
END $$;

-- ============================================================================
-- PART C: Generated participants for Registration Open events (30-50 per event)
-- ============================================================================

DO $$
DECLARE
    event_rec RECORD;
    participant_count int;
BEGIN
    FOR event_rec IN
        SELECT id, title FROM public.events WHERE event_status = 'Registration Open'
    LOOP
        participant_count := 30 + floor(random() * 21)::int;

        INSERT INTO public.event_participants (
            profile_id, event_id, is_user_applied, application_status, attendance_status,
            has_paid, application_date, payment, notes, referred, spot_type, admin_general_notes
        )
        SELECT
            p.id,
            event_rec.id,
            random() < 0.90,
            CASE
                WHEN random() < 0.30 THEN 'pending'
                WHEN random() < 0.50 THEN 'talking'
                WHEN random() < 0.70 THEN 'sent_payment_data'
                WHEN random() < 0.80 THEN 'sent_rules'
                WHEN random() < 0.85 THEN 'think_better'
                ELSE 'finalised'
            END::application_status_enum,
            'pending'::attendance_status_enum,
            random() < 0.40,
            now() - (random() * interval '14 days'),
            (random() * 50)::numeric(10,2),
            CASE WHEN random() < 0.20 THEN 'Aguardando confirmacao' ELSE null END,
            (ARRAY['Indicacao de amigo', 'Evento anterior', 'Redes sociais', 'Instagram', 'ninguem'])[floor(random() * 5 + 1)::int],
            CASE
                WHEN random() < 0.85 THEN 'regular'
                WHEN random() < 0.95 THEN 'social'
                ELSE 'staff'
            END::public.spot_type,
            CASE WHEN random() < 0.10 THEN 'Em analise pela equipe' ELSE null END
        FROM public.profiles p
        WHERE p.approved_to_attend IN ('approved', 'approved_with_reservations', 'pending')
          AND p.id NOT IN (
              SELECT ep.profile_id FROM public.event_participants ep WHERE ep.event_id = event_rec.id
          )
        ORDER BY random()
        LIMIT participant_count;
    END LOOP;
END $$;

-- ============================================================================
-- PART D: Generated participants for Registration Closed events (50-70 per event)
-- ============================================================================

DO $$
DECLARE
    event_rec RECORD;
    participant_count int;
BEGIN
    FOR event_rec IN
        SELECT id, title FROM public.events WHERE event_status = 'Registration Closed'
    LOOP
        participant_count := 50 + floor(random() * 21)::int;

        INSERT INTO public.event_participants (
            profile_id, event_id, is_user_applied, application_status, attendance_status,
            has_paid, application_date, payment, notes, referred, spot_type, admin_general_notes
        )
        SELECT
            p.id,
            event_rec.id,
            random() < 0.90,
            CASE
                WHEN random() < 0.85 THEN 'finalised'
                WHEN random() < 0.95 THEN 'sent_rules'
                ELSE 'sent_payment_data'
            END::application_status_enum,
            'pending'::attendance_status_enum,
            random() < 0.90,
            now() - interval '2 months' - (random() * interval '30 days'),
            (random() * 80)::numeric(10,2),
            CASE WHEN random() < 0.15 THEN 'Confirmado para o evento' ELSE null END,
            (ARRAY['Indicacao de amigo', 'Evento anterior', 'Redes sociais', 'Instagram', 'ninguem'])[floor(random() * 5 + 1)::int],
            CASE
                WHEN random() < 0.85 THEN 'regular'
                WHEN random() < 0.95 THEN 'social'
                ELSE 'staff'
            END::public.spot_type,
            CASE WHEN random() < 0.10 THEN 'Participante confirmado' ELSE null END
        FROM public.profiles p
        WHERE p.approved_to_attend IN ('approved', 'approved_with_reservations')
          AND p.id NOT IN (
              SELECT ep.profile_id FROM public.event_participants ep WHERE ep.event_id = event_rec.id
          )
        ORDER BY random()
        LIMIT participant_count;
    END LOOP;
END $$;

-- ============================================================================
-- PART E: Generated participants for Scheduled events (10-20 per event)
-- ============================================================================

DO $$
DECLARE
    event_rec RECORD;
    participant_count int;
BEGIN
    FOR event_rec IN
        SELECT id, title FROM public.events WHERE event_status = 'Scheduled'
    LOOP
        participant_count := 10 + floor(random() * 11)::int;

        INSERT INTO public.event_participants (
            profile_id, event_id, is_user_applied, application_status, attendance_status,
            has_paid, application_date, payment, notes, referred, spot_type, admin_general_notes
        )
        SELECT
            p.id,
            event_rec.id,
            random() < 0.90,
            CASE
                WHEN random() < 0.60 THEN 'pending'
                WHEN random() < 0.80 THEN 'talking'
                ELSE 'sent_payment_data'
            END::application_status_enum,
            'pending'::attendance_status_enum,
            random() < 0.20,
            now() - (random() * interval '7 days'),
            0,
            CASE WHEN random() < 0.15 THEN 'Inscricao antecipada' ELSE null END,
            (ARRAY['Indicacao de amigo', 'Evento anterior', 'Redes sociais', 'Instagram', 'ninguem'])[floor(random() * 5 + 1)::int],
            CASE
                WHEN random() < 0.85 THEN 'regular'
                WHEN random() < 0.95 THEN 'social'
                ELSE 'staff'
            END::public.spot_type,
            NULL
        FROM public.profiles p
        WHERE p.approved_to_attend IN ('approved', 'approved_with_reservations', 'pending')
          AND p.id NOT IN (
              SELECT ep.profile_id FROM public.event_participants ep WHERE ep.event_id = event_rec.id
          )
        ORDER BY random()
        LIMIT participant_count;
    END LOOP;
END $$;

-- ============================================================================
-- PART F: Generated participants for Cancelled events (15-25 per event)
-- ============================================================================

DO $$
DECLARE
    event_rec RECORD;
    participant_count int;
BEGIN
    FOR event_rec IN
        SELECT id, title FROM public.events WHERE event_status = 'Cancelled'
    LOOP
        participant_count := 15 + floor(random() * 11)::int;

        INSERT INTO public.event_participants (
            profile_id, event_id, is_user_applied, application_status, attendance_status,
            has_paid, application_date, cancellation_date, payment, notes, referred, spot_type, admin_general_notes
        )
        SELECT
            p.id,
            event_rec.id,
            random() < 0.90,
            CASE
                WHEN random() < 0.40 THEN 'finalised'
                WHEN random() < 0.60 THEN 'sent_payment_data'
                WHEN random() < 0.80 THEN 'talking'
                ELSE 'pending'
            END::application_status_enum,
            CASE
                WHEN random() < 0.70 THEN 'pending'
                ELSE 'will-not-go'
            END::attendance_status_enum,
            random() < 0.30,
            now() - interval '3 months' - (random() * interval '30 days'),
            now() - interval '1 month',
            0,
            'Evento cancelado - inscricao congelada',
            (ARRAY['Indicacao de amigo', 'Evento anterior', 'Redes sociais', 'Instagram', 'ninguem'])[floor(random() * 5 + 1)::int],
            CASE
                WHEN random() < 0.85 THEN 'regular'
                WHEN random() < 0.95 THEN 'social'
                ELSE 'staff'
            END::public.spot_type,
            'Evento cancelado'
        FROM public.profiles p
        WHERE p.approved_to_attend IN ('approved', 'approved_with_reservations')
          AND p.id NOT IN (
              SELECT ep.profile_id FROM public.event_participants ep WHERE ep.event_id = event_rec.id
          )
        ORDER BY random()
        LIMIT participant_count;
    END LOOP;
END $$;

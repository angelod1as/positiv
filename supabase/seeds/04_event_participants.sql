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

    SELECT id INTO event_id_reg_open_1 FROM public.events WHERE title = 'Evento Com Inscrições Abertas 1';
    SELECT id INTO event_id_reg_closed_1 FROM public.events WHERE title LIKE 'Evento Com Inscrições Fechadas 1%' LIMIT 1;
    SELECT id INTO event_id_cancelled_1 FROM public.events WHERE title = 'Evento Cancelado 1';
    SELECT id INTO event_id_completed_1 FROM public.events WHERE title = 'Evento Concluído 1';
    SELECT id INTO event_id_scheduled_1 FROM public.events WHERE title = 'Evento Agendado 1';

    INSERT INTO public.event_participants (
        profile_id, event_id, is_user_applied, application_status, attendance_status,
        application_date, cancellation_date, notes,
        referrals, referred, companions, bond, spot_type, admin_general_notes
    )
    VALUES
    (admin_profile_id, event_id_reg_open_1, TRUE, 'sent_payment_data', 'pending', now() - interval '2 months', NULL, 'Admin paid for this participation', NULL, 'Joao Silva - indicacao formal', NULL, 'Posso ir sozinhe.', 'staff', NULL),
    (admin_profile_id, event_id_completed_1, TRUE, 'finalised', 'attended', now() - interval '4 months', NULL, NULL, NULL, 'ninguem', NULL, NULL, 'staff', NULL),
    (admin_profile_id, event_id_cancelled_1, FALSE, 'finalised', 'pending', now() - interval '3 months', now() - interval '1 month', 'Event was cancelled', NULL, 'Joao Silva - indicacao formal', NULL, NULL, 'staff', NULL),
    (user1_profile_id, event_id_reg_open_1, TRUE, 'pending', 'pending', now() - interval '1 day', NULL, NULL, NULL, 'ninguem', NULL, NULL, 'staff', NULL),
    (user1_profile_id, event_id_completed_1, TRUE, 'finalised', 'skipped', now() - interval '4 months', NULL, NULL, NULL, 'ninguem', NULL, NULL, 'staff', 'Admin notes here... why skipped and all...'),
    (user1_profile_id, event_id_reg_closed_1, TRUE, 'sent_payment_data', 'pending', now() - interval '1 month', NULL, 'User paid for this closed event', NULL, 'ninguem', NULL, NULL, 'staff', NULL),
    (user2_profile_id, event_id_reg_open_1, TRUE, 'talking', 'pending', now() - interval '2 days', NULL, 'Admin talking to user about participation', NULL, 'Maria Santos - mesa de bar', NULL, NULL, 'regular', NULL),
    (user2_profile_id, event_id_completed_1, TRUE, 'finalised', 'skipped', now() - interval '4 months', NULL, 'Admin decision: behavioral concerns', NULL, 'Carlos Oliveira - indicacao formal', NULL, NULL, 'regular', NULL),
    (user2_profile_id, event_id_scheduled_1, TRUE, 'finalised', 'skipped', now() - interval '6 months', NULL, 'Admin decision: no-show history', NULL, 'ninguem', 'Vou com meu melhor amigo', NULL, 'regular', NULL),
    (user3_profile_id, event_id_reg_open_1, TRUE, 'sent_payment_data', 'pending', now() - interval '3 days', NULL, 'User sent payment details', NULL, 'Ana Costa - indicacao casual', NULL, NULL, 'regular', NULL),
    (user3_profile_id, event_id_completed_1, TRUE, 'finalised', 'attended', now() - interval '4 months', NULL, 'Great participant!', NULL, 'ninguem', NULL, NULL, 'regular', NULL),
    (user3_profile_id, event_id_scheduled_1, TRUE, 'finalised', 'attended', now() - interval '6 months', NULL, NULL, NULL, 'ninguem', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_reg_open_1, TRUE, 'think_better', 'pending', now() - interval '5 days', NULL, 'User considering participation', NULL, 'Pedro Alves - indicacao formal', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_completed_1, TRUE, 'finalised', 'not-attended', now() - interval '4 months', NULL, 'User applied but did not show up', NULL, 'ninguem', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_reg_closed_1, TRUE, 'finalised', 'pending', now() - interval '2 months', NULL, 'Application finalized', NULL, 'Beatriz Lima - evento anterior', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_scheduled_1, TRUE, 'sent_rules', 'pending', now() - interval '7 months', NULL, 'Admin sent participation rules to user', NULL, 'ninguem', NULL, NULL, 'regular', NULL),
    (user4_profile_id, event_id_cancelled_1, TRUE, 'finalised', 'withdrew', now() - interval '1 month', now() - interval '15 days', 'User decided they will not go', NULL, 'ninguem', NULL, NULL, 'regular', NULL);

    -- Three of the rows above are paid on events that are still live, which the
    -- rule in 10_payments.sql does not reach: it only covers a participation
    -- that finalised. Their money is stated here, where the ids are in scope.
    INSERT INTO public.payments (
        event_participant_id, kind, status, method,
        base_amount, amount, paid_at, due_at, note
    )
    SELECT ep.id, 'manual', 'paid', 'pix', 2000, 2000, ep.application_date, ep.application_date, 'seed'
      FROM public.event_participants ep
     WHERE ep.profile_id = admin_profile_id
       AND ep.event_id = event_id_reg_open_1;

    INSERT INTO public.payments (
        event_participant_id, kind, status, method,
        base_amount, amount, paid_at, due_at, note
    )
    SELECT ep.id, 'manual', 'paid', 'pix', 1500, 1500, ep.application_date, ep.application_date, 'seed'
      FROM public.event_participants ep
     WHERE ep.profile_id = user1_profile_id
       AND ep.event_id = event_id_reg_closed_1;

    INSERT INTO public.payments (
        event_participant_id, kind, status, method,
        base_amount, amount, paid_at, due_at, note
    )
    SELECT ep.id, 'manual', 'paid', 'pix', 2000, 2000, ep.application_date, ep.application_date, 'seed'
      FROM public.event_participants ep
     WHERE ep.profile_id = user4_profile_id
       AND ep.event_id = event_id_scheduled_1;
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
            application_date, notes, referred, spot_type, admin_general_notes
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
                WHEN random() < 0.98 THEN 'withdrew'
                ELSE 'pending'
            END::attendance_status_enum,
            now() - interval '4 months' - (random() * interval '30 days'),
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
            application_date, notes, referred, spot_type, admin_general_notes
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
            now() - (random() * interval '14 days'),
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
            application_date, notes, referred, spot_type, admin_general_notes
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
            now() - interval '2 months' - (random() * interval '30 days'),
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
            application_date, notes, referred, spot_type, admin_general_notes
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
            now() - (random() * interval '7 days'),
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
            application_date, cancellation_date, notes, referred, spot_type, admin_general_notes
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
                ELSE 'withdrew'
            END::attendance_status_enum,
            now() - interval '3 months' - (random() * interval '30 days'),
            now() - interval '1 month',
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

-- Create payment_requests for seeded event_participants
-- Covers: manual paid, automatic paid (PIX + CC), pending, refunded, expired

-------------------------------
-- ADMIN
-------------------------------

-- Admin: reg_open_1 — manual paid (R$20, staff)
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, paid_at, expires_at
)
SELECT ep.id, 20.00, 'paid', 'manual', now() - interval '2 months', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'admin@example.com'
  AND e.title = 'Evento Com Inscrições Abertas 1';

-- Admin: completed_1 — manual paid (R$0, staff free entry)
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, paid_at, expires_at
)
SELECT ep.id, 0, 'paid', 'manual', now() - interval '4 months', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'admin@example.com'
  AND e.title = 'Evento Concluído 1';

-------------------------------
-- USER2 — no payments (talking/skipped statuses)
-------------------------------
-- (intentionally no payment_requests for user2)

-------------------------------
-- USER3 — mix of automatic + manual
-------------------------------

-- User3: reg_open_1 — automatic PIX, awaiting payment
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, payment_method, expires_at
)
SELECT ep.id, COALESCE(e.ticket_price, 0), 'awaiting_payment', 'automatic', 'PIX', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'user3@example.com'
  AND e.title = 'Evento Com Inscrições Abertas 1';

-- User3: completed_1 — automatic credit card 2x, paid
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, payment_method, installment_count, paid_at, expires_at
)
SELECT ep.id, 25.00, 'paid', 'automatic', 'CREDIT_CARD', 2, now() - interval '4 months', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'user3@example.com'
  AND e.title = 'Evento Concluído 1';

-- User3: scheduled_1 — manual paid
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, paid_at, expires_at
)
SELECT ep.id, 20.00, 'paid', 'manual', now() - interval '6 months', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'user3@example.com'
  AND e.title = 'Evento Agendado 1';

-------------------------------
-- USER4 — refunded + expired
-------------------------------

-- User4: completed_1 — automatic PIX, paid then refunded
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, payment_method, paid_at, refund_amount, refunded_at, expires_at
)
SELECT ep.id, 30.00, 'refunded', 'automatic', 'PIX', now() - interval '4 months', 30.00, now() - interval '3 months', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'user4@example.com'
  AND e.title = 'Evento Concluído 1';

-- User4: reg_closed_1 — automatic credit card, expired (never paid)
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, payment_method, expires_at
)
SELECT ep.id, 22.00, 'expired', 'automatic', 'CREDIT_CARD', now() - interval '1 month'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'user4@example.com'
  AND e.title LIKE 'Evento Com Inscrições Fechadas 1%';

-- User4: scheduled_1 — manual pending (admin sent rules, waiting for manual payment)
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, expires_at
)
SELECT ep.id, 15.00, 'pending', 'manual', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'user4@example.com'
  AND e.title = 'Evento Agendado 1';

-------------------------------
-- USER5 — automatic PIX paid
-------------------------------

-- User5: completed event — automatic PIX, paid
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, payment_method, paid_at, expires_at
)
SELECT ep.id, 18.00, 'paid', 'automatic', 'PIX', now() - interval '3 months', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'user5@example.com'
  AND ep.application_status = 'finalised'
  AND e.event_status = 'Completed'
LIMIT 1;

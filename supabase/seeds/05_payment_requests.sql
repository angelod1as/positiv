-- Create payment_requests for seeded event_participants
-- This mirrors what the backfill migration does for production data

-- Admin paid for reg_open_1 (R$20, staff)
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

-- Admin attended completed_1 (R$0, staff — free entry)
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

-- User3 sent_payment_data for reg_open_1 (pending, awaiting payment)
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, expires_at
)
SELECT ep.id, COALESCE(e.ticket_price, 0), 'pending', 'automatic', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'user3@example.com'
  AND e.title = 'Evento Com Inscrições Abertas 1';

-- User3 attended completed_1 (R$25, paid)
INSERT INTO public.payment_requests (
    event_participant_id, amount, status, payment_mode, paid_at, expires_at
)
SELECT ep.id, 25.00, 'paid', 'manual', now() - interval '4 months', now() + interval '2 days'
FROM public.event_participants ep
JOIN public.profiles p ON p.id = ep.profile_id
JOIN auth.users u ON u.id = p.user_id
JOIN public.events e ON e.id = ep.event_id
WHERE u.email = 'user3@example.com'
  AND e.title = 'Evento Concluído 1';

-- User3 attended scheduled_1 (R$20, paid)
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

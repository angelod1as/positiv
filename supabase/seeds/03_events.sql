-- supabase/seed/03_events.sql

-- This script creates 30 events with realistic status distribution:
-- 20 Completed, 4 Cancelled, 2 Registration Open, 2 Registration Closed, 1 Scheduled, 1 Draft
-- 1 legacy BDSM event (completed)

TRUNCATE public.events CASCADE;

INSERT INTO public.events (
    title,
    location,
    description,
    emoji,
    event_status,
    event_type,
    time_event_start,
    time_event_end,
    time_application_start,
    time_group_start,
    time_group_end,
    time_payment_start,
    time_payment_end,
    ticket_price,
    total_spots
)
SELECT
    title,
    location,
    description,
    emoji,
    event_status,
    event_type,
    time_event_start,
    time_event_end,
    time_application_start,
    time_group_start,
    time_group_end,
    time_payment_start,
    time_payment_end,
    ticket_price,
    total_spots
FROM (
    SELECT
        n,
        CASE
            WHEN n <= 20 THEN 'Evento Concluído ' || n
            WHEN n <= 24 THEN 'Evento Cancelado ' || (n - 20)
            WHEN n = 25 THEN 'Festa da Colheita - Inscrições Abertas'
            WHEN n = 26 THEN 'Evento Com Inscrições Abertas 1'
            WHEN n <= 28 THEN 'Evento Com Inscrições Fechadas ' || (n - 26)
            WHEN n = 29 THEN 'Evento Agendado 1'
            ELSE 'Evento Rascunho'
        END AS title,
        CASE
            WHEN n = 25 THEN 'Suite Premium, Motel Harmony'
            ELSE 'Suite Nagoya, Motel Harmony'
        END AS location,
        CASE
            WHEN n <= 20 THEN 'Descricao do evento concluido ' || n || '. Este evento ja aconteceu e foi um sucesso!'
            WHEN n <= 24 THEN 'Aviso: Este evento foi cancelado. Pedimos desculpas pelo inconveniente.'
            WHEN n = 25 THEN 'Sed ut perspiciatis unde omnis iste natus error. Inscrições abertas!'
            WHEN n = 26 THEN 'Morbi non velit sit amet felis fermentum fermentum ut eget dui. Inscrições abertas!'
            WHEN n <= 28 THEN 'As inscricoes para este evento foram encerradas. Aguarde novas oportunidades.'
            WHEN n = 29 THEN 'Prepare-se para este evento! Marque em seus calendarios!'
            ELSE 'Evento em fase de planejamento. Mais informacoes em breve.'
        END AS description,
        CASE
            WHEN n <= 20 THEN (ARRAY['🎉', '🥳', '✨', '🎊', '💃', '🕺', '🌟', '💫', '🔥', '❤️'])[((n - 1) % 10) + 1]
            WHEN n <= 24 THEN '🙅'
            WHEN n = 25 THEN '🔒'
            WHEN n = 26 THEN '🤗'
            WHEN n <= 28 THEN '😓'
            WHEN n = 29 THEN '📅'
            ELSE '📓'
        END AS emoji,
        CASE
            WHEN n <= 20 THEN 'Completed'::public.event_status
            WHEN n <= 24 THEN 'Cancelled'::public.event_status
            WHEN n <= 26 THEN 'Registration Open'::public.event_status
            WHEN n <= 28 THEN 'Registration Closed'::public.event_status
            WHEN n = 29 THEN 'Scheduled'::public.event_status
            ELSE 'Draft'::public.event_status
        END AS event_status,
        CASE
            WHEN n = 10 THEN 'bdsm'::public.event_type_enum
            ELSE 'regular'::public.event_type_enum
        END AS event_type,
        CASE
            WHEN n <= 20 THEN now() - (n * interval '1 month')
            WHEN n <= 24 THEN now() - ((n - 20) * interval '2 months')
            WHEN n <= 26 THEN now() + ((n - 24) * interval '2 months')
            WHEN n <= 28 THEN now() + ((n - 24) * interval '3 months')
            WHEN n = 29 THEN now() + interval '8 months'
            ELSE now() + interval '10 months'
        END AS time_event_start,
        CASE
            WHEN n <= 20 THEN now() - (n * interval '1 month') + interval '4 hours'
            WHEN n <= 24 THEN now() - ((n - 20) * interval '2 months') + interval '3 hours'
            WHEN n <= 26 THEN now() + ((n - 24) * interval '2 months') + interval '5 hours'
            WHEN n <= 28 THEN now() + ((n - 24) * interval '3 months') + interval '4 hours'
            WHEN n = 29 THEN now() + interval '8 months' + interval '3 hours'
            ELSE now() + interval '10 months' + interval '2 hours'
        END AS time_event_end,
        CASE
            WHEN n <= 20 THEN now() - (n * interval '1 month') - interval '2 months'
            WHEN n <= 24 THEN now() - ((n - 20) * interval '2 months') - interval '1 month'
            WHEN n <= 26 THEN now() - interval '1 week'
            WHEN n <= 28 THEN now() - interval '2 months'
            WHEN n = 29 THEN now() + interval '6 months'
            ELSE now() + interval '3 weeks'
        END AS time_application_start,
        CASE
            WHEN n <= 20 THEN now() - (n * interval '1 month') - interval '7 days'
            WHEN n <= 24 THEN now() - ((n - 20) * interval '2 months') - interval '7 days'
            WHEN n <= 26 THEN now() + ((n - 24) * interval '2 months') - interval '7 days'
            WHEN n <= 28 THEN now() + ((n - 24) * interval '3 months') - interval '7 days'
            WHEN n = 29 THEN now() + interval '8 months' - interval '7 days'
            ELSE now() + interval '10 months' - interval '7 days'
        END AS time_group_start,
        CASE
            WHEN n <= 20 THEN now() - (n * interval '1 month') + interval '30 days'
            WHEN n <= 24 THEN now() - ((n - 20) * interval '2 months') + interval '30 days'
            WHEN n <= 26 THEN now() + ((n - 24) * interval '2 months') + interval '30 days'
            WHEN n <= 28 THEN now() + ((n - 24) * interval '3 months') + interval '30 days'
            WHEN n = 29 THEN now() + interval '8 months' + interval '30 days'
            ELSE now() + interval '10 months' + interval '30 days'
        END AS time_group_end,
        CASE
            WHEN n <= 20 THEN now() - (n * interval '1 month') - interval '21 days'
            WHEN n <= 24 THEN now() - ((n - 20) * interval '2 months') - interval '21 days'
            WHEN n <= 26 THEN now() + ((n - 24) * interval '2 months') - interval '21 days'
            WHEN n <= 28 THEN now() + ((n - 24) * interval '3 months') - interval '21 days'
            WHEN n = 29 THEN now() + interval '8 months' - interval '21 days'
            ELSE now() + interval '10 months' - interval '21 days'
        END AS time_payment_start,
        CASE
            WHEN n <= 20 THEN now() - (n * interval '1 month') - interval '9 days'
            WHEN n <= 24 THEN now() - ((n - 20) * interval '2 months') - interval '9 days'
            WHEN n <= 26 THEN now() + ((n - 24) * interval '2 months') - interval '9 days'
            WHEN n <= 28 THEN now() + ((n - 24) * interval '3 months') - interval '9 days'
            WHEN n = 29 THEN now() + interval '8 months' - interval '9 days'
            ELSE now() + interval '10 months' - interval '9 days'
        END AS time_payment_end,
        ((10 + (random() * 140)) * 100)::int AS ticket_price,
        (50 + floor(random() * 150))::int AS total_spots
    FROM generate_series(1, 30) AS n
) AS event_data;

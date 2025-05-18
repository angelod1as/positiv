-- supabase/seed/03_events.sql

-- Clear existing data from the public.events table before seeding
TRUNCATE public.events CASCADE; -- Also truncates related tables due to foreign keys

-- Seed the public.events table with various events having different statuses
INSERT INTO public.events (
    title,
    location,
    description,
    emoji,
    event_status,
    time_event_start,
    time_event_end,
    time_application_start,
    time_application_end,
    time_interviews_start,
    time_interviews_end,
    time_group_start,
    time_group_end,
    time_payment_start,
    time_payment_end,
    ticket_price,
    total_spots
)
VALUES
-- Event 1: Draft
(
    'Evento Rascunho',                                    -- title
    'Suíte Nagoya, Motel Harmony',                      -- location
    'Vestibulum nulla orci, ullamcorper et vehicula in, placerat vel tortor. Praesent fermentum elit a tortor pellentesque, eget luctus turpis laoreet. Nunc pharetra, urna viverra porttitor pharetra, nisl sapien molestie ante, quis blandit arcu urna non metus',            -- description
    '📓',                                               -- emoji
    'Draft',                                            -- event_status
    now() + interval '1 month',                         -- time_event_start
    now() + interval '1 month' + interval '2 hours',    -- time_event_end
    now() + interval '3 weeks',                         -- time_application_start
    now() + interval '4 weeks',                         -- time_application_end
    now() + interval '3 weeks' - interval '21 days',    -- time_interviews_start
    now() + interval '1 month' + interval '2 hours',    -- time_interviews_end
    now() + interval '1 month' - interval '7 days',     -- time_group_start
    now() + interval '1 month' + interval '30 days',    -- time_group_end
    now() + interval '1 month' - interval '21 days',    -- time_payment_start
    now() + interval '1 month' - interval '9 days',     -- time_payment_end
    110.00,                                             -- ticket_price
    100                                                 -- total_spots
),
-- Event 2: Scheduled
(
    'Evento Agendado 1',                                      -- title
    'Suíte Nagoya, Motel Harmony',                            -- location
    'Mauris rutrum sem a enim viverra hendrerit. Aenean mattis odio nec felis vulputate, eget tristique dolor blandit.',                                                -- description
    '📅',                                                     -- emoji
    'Scheduled',                                              -- event_status
    now() + interval '2 months',                              -- time_event_start
    now() + interval '2 months' + interval '3 hours',         -- time_event_end
    now() + interval '1 month',                              -- time_application_start
    now() + interval '1 month' + interval '3 hours',         -- time_application_end
    now() + interval '1 month' - interval '21 days',          -- time_interviews_start
    now() + interval '2 months' + interval '3 hours',         -- time_interviews_end
    now() + interval '2 months' - interval '7 days',          -- time_group_start
    now() + interval '2 months' + interval '30 days',         -- time_group_end
    now() + interval '2 months' - interval '21 days',         -- time_payment_start
    now() + interval '2 months' - interval '9 days',          -- time_payment_end
    10.00,                                                    -- ticket_price
    50                                                        -- total_spots
),
-- Event 3: Registration Open
(
    'Evento Com Inscrições Abertas 1', -- title
    'Suíte Nagoya, Motel Harmony', -- location
    'Morbi non velit sit amet felis fermentum fermentum ut eget dui. Sed vel lorem eu urna pretium vehicula non at urna. ', -- description
    '🤗',                     -- emoji
    'Registration Open',     -- event_status
    now() + interval '3 months', -- time_event_start
    now() + interval '3 months' + interval '4 hours', -- time_event_end
    now() - interval '1 week', -- time_application_start
    now() + interval '2 months', -- time_application_end
    now() + interval '2 months' - interval '21 days',  -- time_interviews_start
    now() + interval '3 months' + interval '4 hours',   -- time_interviews_end
    now() + interval '3 months' - interval '7 days',   -- time_group_start
    now() + interval '3 months' + interval '30 days',  -- time_group_end
    now() + interval '3 months' - interval '21 days',  -- time_payment_start
    now() + interval '3 months' - interval '9 days',   -- time_payment_end
    25.00,                   -- ticket_price
    200                      -- total_spots
),
-- Event 4: Registration Closed
(
    'Evento Com Inscrições Fechadas 1', -- title
    'Suíte Nagoya, Motel Harmony', -- location
    'ivamus nec ante eget urna volutpat feugiat. Curabitur nulla sapien, pulvinar a cursus accumsan, mollis vitae odio. Nulla ac metus eget risus posuere auctor. ', -- description
    '😓',                     -- emoji
    'Registration Closed',   -- event_status
    now() + interval '4 months', -- time_event_start
    now() + interval '4 months' + interval '1 hour', -- time_event_end
    now() - interval '2 months', -- time_application_start
    now() - interval '1 week', -- time_application_end
    now() - interval '1 week' - interval '21 days',  -- time_interviews_start
    now() + interval '4 months' + interval '1 hour', -- time_interviews_end
    now() + interval '4 months' - interval '7 days', -- time_group_start
    now() + interval '4 months' + interval '30 days', -- time_group_end
    now() + interval '4 months' - interval '21 days', -- time_payment_start
    now() + interval '4 months' - interval '9 days',  -- time_payment_end
    15.00,                   -- ticket_price
    150                      -- total_spots
),
-- Event 5: Cancelled
(
    'Evento Cancelado 1',     -- title
    'Suíte Nagoya, Motel Harmony', -- location
    'Aviso: O Evento Cancelado 1 foi cancelado.', -- description
    '',                      -- emoji
    'Cancelled',             -- event_status
    now() - interval '1 hour', -- time_event_start
    now() + interval '2 hours', -- time_event_end
    now() - interval '1 month', -- time_application_start
    now() - interval '2 days', -- time_application_end
    now() - interval '2 days' - interval '21 days',  -- time_interviews_start
    now() + interval '2 hours',                      -- time_interviews_end
    now() - interval '1 hour' - interval '7 days',   -- time_group_start
    now() - interval '1 hour' + interval '30 days',  -- time_group_end
    now() - interval '1 hour' - interval '21 days',  -- time_payment_start
    now() - interval '1 hour' - interval '9 days',   -- time_payment_end
    90.00,                    -- ticket_price
    75                       -- total_spots
),
-- Event 6: Completed
(
    'Evento Concluído 1',     -- title
    'Suíte Nagoya, Motel Harmony', -- location
    'Resumo e resultados do Evento Concluído 1.', -- description
    '🥳',                     -- emoji
    'Completed',             -- event_status
    now() - interval '1 month', -- time_event_start
    now() - interval '1 month' + interval '3 hours', -- time_event_end
    now() - interval '3 months', -- time_application_start
    now() - interval '2 months', -- time_application_end
    now() - interval '2 months' - interval '21 days',  -- time_interviews_start
    now() - interval '1 month' + interval '3 hours',   -- time_interviews_end
    now() - interval '1 month' - interval '7 days',    -- time_group_start
    now() - interval '1 month' + interval '30 days',   -- time_group_end
    now() - interval '1 month' - interval '21 days',   -- time_payment_start
    now() - interval '1 month' - interval '9 days',    -- time_payment_end
    50.00,                   -- ticket_price
    120                      -- total_spots
),
-- Event 7: Cancelled
(
    'Evento Cancelado 2',     -- title
    'Suíte Nagoya, Motel Harmony', -- location
    'Aviso: O Evento Cancelado 2 foi cancelado.', -- description
    '🙅‍♂️',                     -- emoji
    'Cancelled',             -- event_status
    now() + interval '6 months', -- time_event_start
    now() + interval '6 months' + interval '2 hours', -- time_event_end
    now() + interval '1 week', -- time_application_start
    now() + interval '1 month', -- time_application_end
    now() + interval '1 month' - interval '21 days',   -- time_interviews_start
    now() + interval '6 months' + interval '2 hours',  -- time_interviews_end
    now() + interval '6 months' - interval '7 days',   -- time_group_start
    now() + interval '6 months' + interval '30 days',  -- time_group_end
    now() + interval '6 months' - interval '21 days',  -- time_payment_start
    now() + interval '6 months' - interval '9 days',   -- time_payment_end
    90.00,                    -- ticket_price
    30                       -- total_spots
),
-- Event 8: Scheduled
(
    'Evento Agendado 2',     -- title
    'Suíte Nagoya, Motel Harmony', -- location
    'Prepare-se para o Evento Agendado 2! Marque em seus calendários!', -- description
    '🙏',                     -- emoji
    'Scheduled',             -- event_status
    now() + interval '7 months', -- time_event_start
    now() + interval '7 months' + interval '1 hour', -- time_event_end
    now() + interval '6 months', -- time_application_start
    now() + interval '6 months' + interval '2 weeks', -- time_application_end
    now() + interval '6 months' + interval '2 weeks' - interval '21 days',  -- time_interviews_start
    now() + interval '7 months' + interval '1 hour',   -- time_interviews_end
    now() + interval '7 months' - interval '7 days',   -- time_group_start
    now() + interval '7 months' + interval '30 days',  -- time_group_end
    now() + interval '7 months' - interval '21 days',  -- time_payment_start
    now() + interval '7 months' - interval '9 days',   -- time_payment_end
    5.00,                    -- ticket_price
    80                       -- total_spots
);

-- Note: TRUNCATE ensures the table is empty, so no need for ON CONFLICT handling here.

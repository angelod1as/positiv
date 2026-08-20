-- supabase/seeds/09_feedbacks.sql

-- Four feedbacks covering every status and both halves of the profile
-- verification: two are sent from an address that belongs to a seeded profile,
-- so the admin table resolves them to a person; two are not.

INSERT INTO public.feedbacks (
    name,
    email,
    whatsapp,
    has_participated,
    feedback_text,
    can_contact,
    ip_address,
    status,
    created_at
)
VALUES
    -- new, matches user1@example.com by email
    (
        'User One Full Name',
        'user1@example.com',
        NULL,
        'more_than_once',
        'Fui em dois encontros e os dois foram otimos. A unica coisa que senti falta foi de saber com mais antecedencia o endereco, porque moro longe e preciso me organizar.',
        true,
        '187.45.12.90',
        'new',
        now() - interval '2 hours'
    ),
    -- new, anonymous: no name, no email, no phone
    (
        NULL,
        NULL,
        NULL,
        'never',
        'Nunca participei ainda porque fico insegure de ir sozinhe. Seria legal ter alguem pra receber quem chega pela primeira vez.',
        false,
        '200.171.33.4',
        'new',
        now() - interval '1 day'
    ),
    -- in_progress, no matching profile, reachable by phone
    (
        'Maria Souza',
        'maria.souza@example.com',
        '(21) 98765-4321',
        'once',
        'O formulario de inscricao travou no meio e eu tive que preencher tudo de novo. Aconteceu no celular, usando o Chrome.',
        true,
        '177.92.201.15',
        'in_progress',
        now() - interval '5 days'
    ),
    -- resolved, matches user3@example.com by email
    (
        'User Three Full Name',
        'user3@example.com',
        NULL,
        'more_than_once',
        'Queria agradecer pelo cuidado com os nomes e pronomes na recepcao. Fez muita diferenca pra mim e para as pessoas que levei junto.',
        true,
        '191.30.88.220',
        'resolved',
        now() - interval '20 days'
    );

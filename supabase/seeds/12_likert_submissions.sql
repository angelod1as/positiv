-- supabase/seeds/12_likert_submissions.sql

-- Two Likert submissions from user1@example.com, so the admin participant page
-- shows both the open submission and the list of earlier ones. The newer one
-- answers a statement the older one never saw, as happens when the scale
-- changes between submissions. Everyone else has never answered.

WITH person AS (
    SELECT p.id
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE u.email = 'user1@example.com'
),
older AS (
    INSERT INTO public.likert_submissions (profile_id, been_to, submitted_at)
    SELECT id, '{}', now() - interval '50 days' FROM person
    RETURNING id
),
newer AS (
    INSERT INTO public.likert_submissions (profile_id, been_to, submitted_at)
    SELECT id, '{}', now() - interval '3 days' FROM person
    RETURNING id
)
INSERT INTO public.likert_answers (
    submission_id,
    position,
    statement_key,
    statement_text,
    answer,
    comment
)
SELECT older.id, a.position, a.statement_key, a.statement_text, a.answer, a.comment
FROM older, (VALUES
    (0, 'ciume', 'Sinto ciúme às vezes e consigo conversar sobre isso com as pessoas envolvidas.', 3, NULL),
    (1, 'consentimento', 'Peço consentimento antes de tocar alguém, mesmo em um ambiente de festa.', 5, NULL),
    (2, 'nao', 'Quando alguém me diz não, aceito sem insistir.', 4, 'Às vezes preciso de um tempo pra processar.')
) AS a (position, statement_key, statement_text, answer, comment)
UNION ALL
SELECT newer.id, a.position, a.statement_key, a.statement_text, a.answer, a.comment
FROM newer, (VALUES
    (0, 'ciume', 'Sinto ciúme às vezes e consigo conversar sobre isso com as pessoas envolvidas.', 4, 'Melhorei bastante desde a última festa, faço terapia.'),
    (1, 'consentimento', 'Peço consentimento antes de tocar alguém, mesmo em um ambiente de festa.', 5, NULL),
    (2, 'nao', 'Quando alguém me diz não, aceito sem insistir.', 5, NULL),
    (3, 'alcool', 'Bebida alcoólica não muda o que eu acho aceitável fazer.', 2, 'Confesso que já passei do ponto uma vez.')
) AS a (position, statement_key, statement_text, answer, comment);

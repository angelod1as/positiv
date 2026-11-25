-- WEB-70: the two objective questions that left the Likert scale (WEB-63)
-- become part of a person's registration data.
--
-- places_attended answers "A quais destes você já foi?": the labels picked, as
-- with gender and race_color. "Nenhum destes" is stored like any other label,
-- so an empty answer (null) still means the person was never asked.
--
-- non_monogamy_since answers "Desde quando você vive a não-monogamia?" with a
-- year, and non_monogamy_not_living records the opt-out "Não vivo a
-- não-monogamia hoje". Both empty means the question is unanswered; both set
-- is a contradiction the check refuses.
--
-- The server reads and writes them through Kysely as the owner. No grant to
-- authenticated: only admins see the answers, and nothing reads them through
-- the Data API. service_role keeps its table-wide grant.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS places_attended text[],
  ADD COLUMN IF NOT EXISTS non_monogamy_since smallint,
  ADD COLUMN IF NOT EXISTS non_monogamy_not_living boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_non_monogamy_answer_check
    CHECK (
      NOT (non_monogamy_not_living AND non_monogamy_since IS NOT NULL)
      AND (non_monogamy_since IS NULL OR non_monogamy_since >= 1950)
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

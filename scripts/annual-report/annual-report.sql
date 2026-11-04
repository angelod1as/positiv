-- Annual report audience numbers. Read only: one SELECT, no writes.
-- Set the report year below; the three years before it come out too, for
-- the comparisons. Never reads demographics_history (see WEB-23).
WITH params AS (
  SELECT 2026 AS report_year
),

years AS (
  SELECT generate_series(report_year - 3, report_year) AS year
  FROM params
),

parties AS (
  SELECT
    e.id,
    e.time_event_start,
    extract(year FROM e.time_event_start AT TIME ZONE 'America/Sao_Paulo')::int AS year
  FROM public.events e
  WHERE e.event_status NOT IN ('Draft', 'Cancelled')
    AND e.time_event_start IS NOT NULL
),

report_parties AS (
  SELECT p.*
  FROM parties p
  JOIN years y ON y.year = p.year
),

metrics AS (
  SELECT year, 'parties' AS metric, NULL::text AS category, count(*)::numeric AS value
  FROM report_parties
  GROUP BY year
)

SELECT year, metric, category, value
FROM metrics
ORDER BY year DESC, metric, category

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

attendances AS (
  SELECT rp.year, ep.profile_id, ep.spot_type, rp.time_event_start
  FROM public.event_participants ep
  JOIN report_parties rp ON rp.id = ep.event_id
  WHERE ep.attendance_status = 'attended'
    AND ep.profile_id IS NOT NULL
),

first_parties AS (
  SELECT ep.profile_id, min(p.year) AS year
  FROM public.event_participants ep
  JOIN parties p ON p.id = ep.event_id
  WHERE ep.attendance_status = 'attended'
    AND ep.profile_id IS NOT NULL
  GROUP BY ep.profile_id
),

metrics AS (
  SELECT year, 'parties' AS metric, NULL::text AS category, count(*)::numeric AS value
  FROM report_parties
  GROUP BY year

  UNION ALL
  SELECT year, 'people', NULL, count(DISTINCT profile_id)
  FROM attendances
  GROUP BY year

  UNION ALL
  SELECT year, 'social_spots', NULL, count(*)
  FROM attendances
  WHERE spot_type = 'social'
  GROUP BY year

  UNION ALL
  SELECT fp.year, 'novates', NULL, count(*)
  FROM first_parties fp
  JOIN years y ON y.year = fp.year
  GROUP BY fp.year
)

SELECT year, metric, category, value
FROM metrics
ORDER BY year DESC, metric, category

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

-- Age at the person's first party of the year, kept to 18-120 like the
-- admin dashboard does.
ages AS (
  SELECT year, age
  FROM (
    SELECT
      a.year,
      extract(year FROM age(
        (min(a.time_event_start) AT TIME ZONE 'America/Sao_Paulo')::date,
        pr.date_of_birth
      ))::int AS age
    FROM attendances a
    JOIN public.profiles pr ON pr.id = a.profile_id
    WHERE pr.date_of_birth IS NOT NULL
    GROUP BY a.year, a.profile_id, pr.date_of_birth
  ) person_ages
  WHERE age BETWEEN 18 AND 120
),

age_ranges (category, low, high) AS (
  VALUES
    ('18-24', 18, 24),
    ('25-29', 25, 29),
    ('30-34', 30, 34),
    ('35-39', 35, 39),
    ('40-49', 40, 49),
    ('50+', 50, 120)
),

-- Gender, orientation and race/colour are multi-select: each value counts
-- once per person, so a year's values add up to more than its people.
answers AS (
  SELECT DISTINCT a.year, a.profile_id, f.metric, coalesce(v.value, 'Não informado') AS category
  FROM attendances a
  JOIN public.profiles pr ON pr.id = a.profile_id
  CROSS JOIN LATERAL (
    VALUES
      ('gender', pr.gender),
      ('orientation', pr.orientation),
      ('race_color', pr.race_color)
  ) AS f (metric, answer)
  LEFT JOIN LATERAL (
    SELECT trim(x) AS value
    FROM unnest(f.answer) AS x
    WHERE trim(x) <> ''
  ) v ON true
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

  UNION ALL
  SELECT year, 'age', stat.category, stat.value
  FROM (
    SELECT year, min(age)::numeric AS min, round(avg(age), 1) AS avg, max(age)::numeric AS max
    FROM ages
    GROUP BY year
  ) s
  CROSS JOIN LATERAL (
    VALUES ('min', s.min), ('avg', s.avg), ('max', s.max)
  ) AS stat (category, value)

  UNION ALL
  SELECT y.year, 'age_range', r.category, count(a.age)
  FROM years y
  CROSS JOIN age_ranges r
  LEFT JOIN ages a ON a.year = y.year AND a.age BETWEEN r.low AND r.high
  GROUP BY y.year, r.category

  UNION ALL
  SELECT year, metric, category, count(*)
  FROM answers
  GROUP BY year, metric, category
)

SELECT year, metric, category, value
FROM metrics
ORDER BY year DESC, metric, category

-- Annual report audience numbers. Read only: one SELECT, no writes.
-- Set the report year below; the three years before it come out too, for
-- the comparisons. Never reads demographics_history (see WEB-23).
-- Counts read 0 for an empty year; a stat with nothing to measure (an
-- age, an average, a rate) has no row, as it is undefined rather than 0.
-- Tested by app/test/annual-report-sql.integration.test.ts.
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
    e.event_type,
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
  SELECT rp.year, ep.event_id, ep.profile_id, ep.spot_type, rp.time_event_start
  FROM public.event_participants ep
  JOIN report_parties rp ON rp.id = ep.event_id
  WHERE ep.attendance_status = 'attended'
    AND ep.profile_id IS NOT NULL
),

party_people AS (
  SELECT DISTINCT year, event_id, profile_id
  FROM attendances
),

party_sizes AS (
  SELECT year, event_id, count(*) AS people
  FROM party_people
  GROUP BY year, event_id
),

parties_per_person AS (
  SELECT year, profile_id, count(*) AS parties
  FROM party_people
  GROUP BY year, profile_id
),

-- Every year, not only the report's: novates and retention look back
-- before the window.
yearly_people AS (
  SELECT DISTINCT p.year, ep.profile_id
  FROM public.event_participants ep
  JOIN parties p ON p.id = ep.event_id
  WHERE ep.attendance_status = 'attended'
    AND ep.profile_id IS NOT NULL
),

first_parties AS (
  SELECT profile_id, min(year) AS year
  FROM yearly_people
  GROUP BY profile_id
),

retention AS (
  SELECT
    y.year,
    count(this_year.profile_id) AS came_back,
    round(100.0 * count(this_year.profile_id) / count(*), 1) AS rate
  FROM years y
  JOIN yearly_people last_year ON last_year.year = y.year - 1
  LEFT JOIN yearly_people this_year
    ON this_year.year = y.year AND this_year.profile_id = last_year.profile_id
  GROUP BY y.year
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
-- where_lives is a single free-text answer, counted the same way.
answers AS (
  SELECT DISTINCT a.year, a.profile_id, f.metric, coalesce(v.value, 'Não informado') AS category
  FROM attendances a
  JOIN public.profiles pr ON pr.id = a.profile_id
  CROSS JOIN LATERAL (
    VALUES
      ('gender', pr.gender),
      ('orientation', pr.orientation),
      ('race_color', pr.race_color),
      ('where_lives', ARRAY[pr.where_lives])
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
  SELECT year, 'social_spots', NULL, count(DISTINCT (event_id, profile_id))
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

  UNION ALL
  SELECT year, 'repeat_people', NULL, count(*) FILTER (WHERE parties >= 2)
  FROM parties_per_person
  GROUP BY year

  UNION ALL
  SELECT year, 'max_parties_per_person', NULL, max(parties)
  FROM parties_per_person
  GROUP BY year

  UNION ALL
  SELECT year, 'attendances', NULL, sum(people)
  FROM party_sizes
  GROUP BY year

  UNION ALL
  SELECT year, 'avg_people_per_party', NULL, round(avg(people), 1)
  FROM party_sizes
  GROUP BY year

  UNION ALL
  SELECT year, 'max_people_per_party', NULL, max(people)
  FROM party_sizes
  GROUP BY year

  UNION ALL
  SELECT application.year, a.metric, NULL, a.value
  FROM (
    SELECT
      rp.year,
      count(DISTINCT (ep.event_id, ep.profile_id)) AS applications,
      count(DISTINCT ep.profile_id) AS applicants,
      count(DISTINCT ep.profile_id) FILTER (
        WHERE ep.attendance_status = 'attended'
      ) AS admitted
    FROM public.event_participants ep
    JOIN report_parties rp ON rp.id = ep.event_id
    WHERE ep.spot_type <> 'staff'
      AND ep.profile_id IS NOT NULL
    GROUP BY rp.year
  ) application
  CROSS JOIN LATERAL (
    VALUES
      ('applications', application.applications),
      ('applicants', application.applicants),
      ('people_without_staff', application.admitted),
      ('acceptance_rate', round(100.0 * application.admitted / application.applicants, 1))
  ) AS a (metric, value)

  UNION ALL
  SELECT y.year, 'parties_by_type', t.event_type::text, count(rp.id)
  FROM years y
  CROSS JOIN unnest(enum_range(NULL::public.event_type_enum)) AS t (event_type)
  LEFT JOIN report_parties rp ON rp.year = y.year AND rp.event_type = t.event_type
  GROUP BY y.year, t.event_type

  UNION ALL
  SELECT year, 'returning_people', NULL, came_back
  FROM retention

  UNION ALL
  SELECT year, 'retention_rate', NULL, rate
  FROM retention
),

counts (metric) AS (
  VALUES
    ('parties'), ('people'), ('social_spots'), ('novates'),
    ('repeat_people'), ('attendances'), ('applications'), ('applicants'),
    ('people_without_staff'), ('returning_people')
)

SELECT year, metric, category, value
FROM metrics

UNION ALL
SELECT y.year, c.metric, NULL, 0
FROM years y
CROSS JOIN counts c
WHERE NOT EXISTS (
  SELECT 1 FROM metrics m WHERE m.year = y.year AND m.metric = c.metric
)

ORDER BY year DESC, metric, category

import { sql } from "kysely"
import { db } from "~/lib/supabase/db.server"
import type { DatavizRange } from "./dataviz-range"
import type { PartySummary } from "./dataviz.types"

type SummaryRow = {
  parties: number
  people: number
  attendances: number
  applications: number
  applicants: number
  admitted: number
  avg_people_per_party: string | null
  max_people_per_party: number | null
  newcomers: number
  newcomers_returned: number
  repeat_people: number
  min_age: number | null
  avg_age: string | null
  max_age: number | null
  social_spots: number
}

// Mirrors scripts/annual-report/annual-report.sql over a party range
// instead of a year, so the page and the report never disagree.
export async function getPartySummary(range: DatavizRange): Promise<PartySummary> {
  const { rows } = await sql<SummaryRow>`
    WITH parties AS (
      SELECT id, time_event_start
      FROM events
      WHERE event_status = 'Completed'
        AND time_event_start >= ${range.from}
        AND time_event_start <= ${range.to}
    ),
    attendances AS (
      SELECT ep.event_id, ep.profile_id, ep.spot_type, p.time_event_start
      FROM event_participants ep
      JOIN parties p ON p.id = ep.event_id
      WHERE ep.attendance_status = 'attended'
        AND ep.profile_id IS NOT NULL
    ),
    party_sizes AS (
      SELECT event_id, count(DISTINCT profile_id) AS people
      FROM attendances
      GROUP BY event_id
    ),
    parties_per_person AS (
      SELECT profile_id, count(DISTINCT event_id) AS parties
      FROM attendances
      GROUP BY profile_id
    ),
    applications AS (
      SELECT DISTINCT ep.event_id, ep.profile_id, ep.attendance_status
      FROM event_participants ep
      JOIN parties p ON p.id = ep.event_id
      WHERE ep.spot_type <> 'staff'
        AND ep.profile_id IS NOT NULL
    ),
    first_parties AS (
      SELECT ep.profile_id, min(e.time_event_start) AS first_start
      FROM event_participants ep
      JOIN events e ON e.id = ep.event_id
      WHERE ep.attendance_status = 'attended'
        AND ep.profile_id IS NOT NULL
        AND e.event_status NOT IN ('Draft', 'Cancelled')
      GROUP BY ep.profile_id
    ),
    newcomers AS (
      SELECT profile_id, first_start
      FROM first_parties
      WHERE first_start >= ${range.from}
        AND first_start <= ${range.to}
    ),
    ages AS (
      SELECT age
      FROM (
        SELECT extract(year FROM age(
          (min(a.time_event_start) AT TIME ZONE 'America/Sao_Paulo')::date,
          pr.date_of_birth::date
        ))::int AS age
        FROM attendances a
        JOIN profiles pr ON pr.id = a.profile_id
        WHERE pr.date_of_birth IS NOT NULL
        GROUP BY a.profile_id, pr.date_of_birth
      ) person_ages
      WHERE age BETWEEN 18 AND 120
    )
    SELECT
      (SELECT count(*) FROM parties)::int AS parties,
      (SELECT count(DISTINCT profile_id) FROM attendances)::int AS people,
      (SELECT count(*) FROM attendances)::int AS attendances,
      (SELECT count(*) FROM applications)::int AS applications,
      (SELECT count(DISTINCT profile_id) FROM applications)::int AS applicants,
      (SELECT count(DISTINCT profile_id) FROM applications
        WHERE attendance_status = 'attended')::int AS admitted,
      (SELECT round(avg(people), 1) FROM party_sizes) AS avg_people_per_party,
      (SELECT max(people) FROM party_sizes)::int AS max_people_per_party,
      (SELECT count(*) FROM newcomers)::int AS newcomers,
      (SELECT count(*) FROM newcomers n
        WHERE EXISTS (
          SELECT 1
          FROM event_participants ep
          JOIN events e ON e.id = ep.event_id
          WHERE ep.profile_id = n.profile_id
            AND ep.attendance_status = 'attended'
            AND e.event_status NOT IN ('Draft', 'Cancelled')
            AND e.time_event_start > n.first_start
        ))::int AS newcomers_returned,
      (SELECT count(*) FROM parties_per_person WHERE parties >= 2)::int AS repeat_people,
      (SELECT min(age) FROM ages)::int AS min_age,
      (SELECT round(avg(age), 1) FROM ages) AS avg_age,
      (SELECT max(age) FROM ages)::int AS max_age,
      (SELECT count(*) FROM attendances WHERE spot_type = 'social')::int AS social_spots
  `.execute(db)

  const row = rows[0]
  return {
    parties: row.parties,
    people: row.people,
    attendances: row.attendances,
    applications: row.applications,
    acceptance_rate:
      row.applicants > 0 ? Math.round((1000 * row.admitted) / row.applicants) / 10 : 0,
    avg_people_per_party: Number(row.avg_people_per_party ?? 0),
    max_people_per_party: row.max_people_per_party ?? 0,
    newcomers: row.newcomers,
    newcomers_returned: row.newcomers_returned,
    repeat_people: row.repeat_people,
    age:
      row.min_age === null || row.max_age === null
        ? null
        : { min: row.min_age, avg: Number(row.avg_age), max: row.max_age },
    social_spots: row.social_spots,
  }
}

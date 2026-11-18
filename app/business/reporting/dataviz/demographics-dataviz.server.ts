import { sql } from "kysely"
import { db } from "~/lib/supabase/db.server"
import { type DatavizRange, fullDatavizRange } from "./dataviz-range"
import type {
  VeteranRookieDataPoint,
  DemographicsDataResult,
  DemographicDistribution,
} from "./dataviz.types"

export async function getVeteranRookieData(
  range: DatavizRange = fullDatavizRange(),
): Promise<
  VeteranRookieDataPoint[]
> {
  // A newcomer is at their first party ever, a veteran has been to one
  // before. It looks back past the range: imported parties have real
  // attendance, as the annual report counts it.
  const result = await db
    .with("first_parties", (qb) =>
      qb
        .selectFrom("event_participants")
        .innerJoin("events", "events.id", "event_participants.event_id")
        .where("event_participants.attendance_status", "=", "attended")
        .where("event_participants.profile_id", "is not", null)
        .where("events.event_status", "not in", ["Draft", "Cancelled"])
        .groupBy("event_participants.profile_id")
        .select([
          "event_participants.profile_id",
          sql<string>`min(events.time_event_start)`.as("first_start"),
        ])
    )
    .selectFrom("events")
    .leftJoin("event_participants", (join) =>
      join
        .onRef("event_participants.event_id", "=", "events.id")
        .on("event_participants.attendance_status", "=", "attended")
    )
    .leftJoin(
      "first_parties",
      "first_parties.profile_id",
      "event_participants.profile_id"
    )
    .where("events.event_status", "=", "Completed")
    .where("events.time_event_start", ">=", range.from)
    .where("events.time_event_start", "<=", range.to)
    .groupBy([
      "events.id",
      "events.title",
      "events.emoji",
      "events.time_event_start",
    ])
    .orderBy("events.time_event_start", "asc")
    .select([
      "events.title",
      "events.emoji",
      "events.time_event_start as date",
      sql<number>`count(distinct event_participants.profile_id) filter (where first_parties.first_start < events.time_event_start)::int`.as(
        "veterans"
      ),
      sql<number>`count(distinct event_participants.profile_id) filter (where first_parties.first_start >= events.time_event_start)::int`.as(
        "rookies"
      ),
    ])
    .execute()

  return result.map((row) => ({
    title: row.title ?? "",
    emoji: row.emoji ?? "",
    date: row.date ? new Date(row.date).toISOString() : "",
    veterans: row.veterans,
    rookies: row.rookies,
  }))
}

type DemographicsMode = "all" | "attended"

export async function getDemographicsData(
  mode: DemographicsMode,
  range: DatavizRange = fullDatavizRange(),
): Promise<DemographicsDataResult> {
  // Build the base query depending on mode:
  // - "attended": Show demographics of profiles who attended events >= cutoff date
  // - "all": Show demographics of ALL profiles (no date filter) as a baseline for comparison
  let profileIds: string[] = []

  if (mode === "attended") {
    // Get profile IDs that have attended at least one event (filtered by cutoff date)
    const attendedProfiles = await db
      .selectFrom("event_participants")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .where("event_participants.attendance_status", "=", "attended")
      .where("events.event_status", "=", "Completed")
      .where("events.time_event_start", ">=", range.from)
      .where("events.time_event_start", "<=", range.to)
      .select("event_participants.profile_id")
      .distinct()
      .execute()

    profileIds = attendedProfiles
      .map((p) => p.profile_id)
      .filter((id): id is string => id !== null)

    if (profileIds.length === 0) {
      return { gender: [], orientation: [], age: [], race: [] }
    }
  }

  const shouldFilterByAttendees = mode === "attended" && profileIds.length > 0

  // Create parameterized UUID array for safe SQL binding
  const profileIdsArray = sql.join(
    profileIds.map((id) => sql`${id}::uuid`)
  )

  // Run all 4 demographic queries in parallel for better performance
  // Using parameterized queries with ARRAY[] to prevent SQL injection
  const [genderResult, orientationResult, raceResult, ageResult] =
    await Promise.all([
      // Query gender distribution
      shouldFilterByAttendees
        ? sql<{ category: string; count: number }>`
            SELECT g.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.gender) as g(value)
            WHERE profiles.gender IS NOT NULL
              AND profiles.id = ANY(ARRAY[${profileIdsArray}])
            GROUP BY g.value
          `.execute(db)
        : sql<{ category: string; count: number }>`
            SELECT g.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.gender) as g(value)
            WHERE profiles.gender IS NOT NULL
            GROUP BY g.value
          `.execute(db),

      // Query orientation distribution
      shouldFilterByAttendees
        ? sql<{ category: string; count: number }>`
            SELECT o.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.orientation) as o(value)
            WHERE profiles.orientation IS NOT NULL
              AND profiles.id = ANY(ARRAY[${profileIdsArray}])
            GROUP BY o.value
          `.execute(db)
        : sql<{ category: string; count: number }>`
            SELECT o.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.orientation) as o(value)
            WHERE profiles.orientation IS NOT NULL
            GROUP BY o.value
          `.execute(db),

      // Query race distribution
      shouldFilterByAttendees
        ? sql<{ category: string; count: number }>`
            SELECT r.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.race_color) as r(value)
            WHERE profiles.race_color IS NOT NULL
              AND profiles.id = ANY(ARRAY[${profileIdsArray}])
            GROUP BY r.value
          `.execute(db)
        : sql<{ category: string; count: number }>`
            SELECT r.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.race_color) as r(value)
            WHERE profiles.race_color IS NOT NULL
            GROUP BY r.value
          `.execute(db),

      // Query age distribution: an attendee's age at their first party in
      // the range, kept to 18-120 as the annual report does
      shouldFilterByAttendees
        ? sql<{ category: string; count: number }>`
            SELECT
              CASE
                WHEN age BETWEEN 18 AND 24 THEN '18-24'
                WHEN age BETWEEN 25 AND 29 THEN '25-29'
                WHEN age BETWEEN 30 AND 34 THEN '30-34'
                WHEN age BETWEEN 35 AND 39 THEN '35-39'
                WHEN age BETWEEN 40 AND 49 THEN '40-49'
                ELSE '50+'
              END as category,
              count(*)::int as count
            FROM (
              SELECT extract(year FROM age(
                (min(events.time_event_start) AT TIME ZONE 'America/Sao_Paulo')::date,
                profiles.date_of_birth::date
              ))::int as age
              FROM profiles
              JOIN event_participants ON event_participants.profile_id = profiles.id
              JOIN events ON events.id = event_participants.event_id
              WHERE profiles.date_of_birth IS NOT NULL
                AND event_participants.attendance_status = 'attended'
                AND events.event_status = 'Completed'
                AND events.time_event_start >= ${range.from}
                AND events.time_event_start <= ${range.to}
                AND profiles.id = ANY(ARRAY[${profileIdsArray}])
              GROUP BY profiles.id, profiles.date_of_birth
            ) person_ages
            WHERE age BETWEEN 18 AND 120
            GROUP BY 1
          `.execute(db)
        : sql<{ category: string; count: number }>`
            SELECT
              CASE
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 18 AND 24 THEN '18-24'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 25 AND 29 THEN '25-29'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 30 AND 34 THEN '30-34'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 35 AND 39 THEN '35-39'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 40 AND 49 THEN '40-49'
                ELSE '50+'
              END as category,
              count(*)::int as count
            FROM profiles
            WHERE profiles.date_of_birth IS NOT NULL
              AND date_part('year', age(profiles.date_of_birth::date)) BETWEEN 18 AND 120
            GROUP BY
              CASE
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 18 AND 24 THEN '18-24'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 25 AND 29 THEN '25-29'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 30 AND 34 THEN '30-34'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 35 AND 39 THEN '35-39'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 40 AND 49 THEN '40-49'
                ELSE '50+'
              END
          `.execute(db),
    ])

  // Calculate totals for percentages
  const genderTotal = genderResult.rows.reduce((sum: number, r) => sum + r.count, 0)
  const orientationTotal = orientationResult.rows.reduce((sum: number, r) => sum + r.count, 0)
  const raceTotal = raceResult.rows.reduce((sum: number, r) => sum + r.count, 0)
  const ageTotal = ageResult.rows.reduce((sum: number, r) => sum + r.count, 0)

  const toDistribution = (
    data: { category: string; count: number }[],
    total: number
  ): DemographicDistribution[] =>
    data.map((d) => ({
      category: d.category,
      count: d.count,
      percentage: total > 0 ? Math.round((d.count / total) * 100) : 0,
    }))

  return {
    gender: toDistribution(genderResult.rows, genderTotal),
    orientation: toDistribution(orientationResult.rows, orientationTotal),
    race: toDistribution(raceResult.rows, raceTotal),
    age: toDistribution(ageResult.rows, ageTotal),
  }
}

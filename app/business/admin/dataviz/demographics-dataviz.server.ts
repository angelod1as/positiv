import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"
import type {
  VeteranRookieDataPoint,
  DemographicsDataResult,
  DemographicDistribution,
} from "./dataviz.types"

const EVENT_CUTOFF_DATE = "2025-07-01"

export async function getVeteranRookieData(): Promise<
  VeteranRookieDataPoint[]
> {
  const result = await kyselyDb
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .leftJoin("profiles", "profiles.id", "event_participants.profile_id")
    .where("events.event_status", "=", "Completed")
    .where("events.time_event_start", ">=", EVENT_CUTOFF_DATE)
    .where((eb) =>
      eb.or([
        eb("event_participants.attendance_status", "=", "attended"),
        eb("event_participants.id", "is", null),
      ])
    )
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
      sql<number>`count(*) filter (where event_participants.id is not null and profiles.became_veteran_date is not null and profiles.became_veteran_date < events.time_event_start)::int`.as(
        "veterans"
      ),
      sql<number>`count(*) filter (where event_participants.id is not null and (profiles.became_veteran_date is null or profiles.became_veteran_date >= events.time_event_start))::int`.as(
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
  mode: DemographicsMode
): Promise<DemographicsDataResult> {
  // Build the base query depending on mode
  let profileIds: string[] = []

  if (mode === "attended") {
    // Get profile IDs that have attended at least one event
    const attendedProfiles = await kyselyDb
      .selectFrom("event_participants")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .where("event_participants.attendance_status", "=", "attended")
      .where("events.event_status", "=", "Completed")
      .where("events.time_event_start", ">=", EVENT_CUTOFF_DATE)
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
          `.execute(kyselyDb)
        : sql<{ category: string; count: number }>`
            SELECT g.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.gender) as g(value)
            WHERE profiles.gender IS NOT NULL
            GROUP BY g.value
          `.execute(kyselyDb),

      // Query orientation distribution
      shouldFilterByAttendees
        ? sql<{ category: string; count: number }>`
            SELECT o.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.orientation) as o(value)
            WHERE profiles.orientation IS NOT NULL
              AND profiles.id = ANY(ARRAY[${profileIdsArray}])
            GROUP BY o.value
          `.execute(kyselyDb)
        : sql<{ category: string; count: number }>`
            SELECT o.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.orientation) as o(value)
            WHERE profiles.orientation IS NOT NULL
            GROUP BY o.value
          `.execute(kyselyDb),

      // Query race distribution
      shouldFilterByAttendees
        ? sql<{ category: string; count: number }>`
            SELECT r.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.race_color) as r(value)
            WHERE profiles.race_color IS NOT NULL
              AND profiles.id = ANY(ARRAY[${profileIdsArray}])
            GROUP BY r.value
          `.execute(kyselyDb)
        : sql<{ category: string; count: number }>`
            SELECT r.value as category, count(distinct profiles.id)::int as count
            FROM profiles, unnest(profiles.race_color) as r(value)
            WHERE profiles.race_color IS NOT NULL
            GROUP BY r.value
          `.execute(kyselyDb),

      // Query age distribution
      shouldFilterByAttendees
        ? sql<{ category: string; count: number }>`
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
              AND date_part('year', age(profiles.date_of_birth::date)) >= 18
              AND profiles.id = ANY(ARRAY[${profileIdsArray}])
            GROUP BY
              CASE
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 18 AND 24 THEN '18-24'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 25 AND 29 THEN '25-29'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 30 AND 34 THEN '30-34'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 35 AND 39 THEN '35-39'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 40 AND 49 THEN '40-49'
                ELSE '50+'
              END
          `.execute(kyselyDb)
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
              AND date_part('year', age(profiles.date_of_birth::date)) >= 18
            GROUP BY
              CASE
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 18 AND 24 THEN '18-24'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 25 AND 29 THEN '25-29'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 30 AND 34 THEN '30-34'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 35 AND 39 THEN '35-39'
                WHEN date_part('year', age(profiles.date_of_birth::date)) BETWEEN 40 AND 49 THEN '40-49'
                ELSE '50+'
              END
          `.execute(kyselyDb),
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

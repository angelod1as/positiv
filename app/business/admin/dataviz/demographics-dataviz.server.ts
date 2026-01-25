import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"
import type {
  VeteranRookieDataPoint,
  DemographicsDataResult,
  DemographicDistribution,
} from "./dataviz.types"

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
    date: row.date ?? "",
    veterans: row.veterans,
    rookies: row.rookies,
  }))
}

type DemographicsMode = "all" | "attended"

export async function getDemographicsData(
  mode: DemographicsMode
): Promise<DemographicsDataResult> {
  // Build the base query depending on mode
  let profileIds: string[]

  if (mode === "attended") {
    // Get profile IDs that have attended at least one event
    const attendedProfiles = await kyselyDb
      .selectFrom("event_participants")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .where("event_participants.attendance_status", "=", "attended")
      .where("events.event_status", "=", "Completed")
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

  // Query gender distribution
  const genderQuery = kyselyDb
    .selectFrom("profiles")
    .innerJoin(sql`unnest(profiles.gender) as g(value)`, (join) =>
      join.onTrue()
    )
    .where("profiles.gender", "is not", null)
    .groupBy(sql`g.value`)
    .select([
      sql<string>`g.value`.as("category"),
      sql<number>`count(distinct profiles.id)::int`.as("count"),
    ])

  const genderResult = await (mode === "attended" && profileIds!.length > 0
    ? genderQuery.where("profiles.id", "in", profileIds!)
    : genderQuery
  ).execute()

  // Query orientation distribution
  const orientationQuery = kyselyDb
    .selectFrom("profiles")
    .innerJoin(sql`unnest(profiles.orientation) as o(value)`, (join) =>
      join.onTrue()
    )
    .where("profiles.orientation", "is not", null)
    .groupBy(sql`o.value`)
    .select([
      sql<string>`o.value`.as("category"),
      sql<number>`count(distinct profiles.id)::int`.as("count"),
    ])

  const orientationResult = await (mode === "attended" && profileIds!.length > 0
    ? orientationQuery.where("profiles.id", "in", profileIds!)
    : orientationQuery
  ).execute()

  // Query race distribution
  const raceQuery = kyselyDb
    .selectFrom("profiles")
    .innerJoin(sql`unnest(profiles.race_color) as r(value)`, (join) =>
      join.onTrue()
    )
    .where("profiles.race_color", "is not", null)
    .groupBy(sql`r.value`)
    .select([
      sql<string>`r.value`.as("category"),
      sql<number>`count(distinct profiles.id)::int`.as("count"),
    ])

  const raceResult = await (mode === "attended" && profileIds!.length > 0
    ? raceQuery.where("profiles.id", "in", profileIds!)
    : raceQuery
  ).execute()

  // Query age distribution
  const ageQuery = kyselyDb
    .selectFrom("profiles")
    .where("profiles.date_of_birth", "is not", null)
    .select([
      sql<string>`
        CASE
          WHEN date_part('year', age(profiles.date_of_birth::date)) < 25 THEN '18-24'
          WHEN date_part('year', age(profiles.date_of_birth::date)) < 35 THEN '25-34'
          WHEN date_part('year', age(profiles.date_of_birth::date)) < 45 THEN '35-44'
          WHEN date_part('year', age(profiles.date_of_birth::date)) < 55 THEN '45-54'
          ELSE '55+'
        END
      `.as("category"),
      sql<number>`count(*)::int`.as("count"),
    ])
    .groupBy(sql`
        CASE
          WHEN date_part('year', age(profiles.date_of_birth::date)) < 25 THEN '18-24'
          WHEN date_part('year', age(profiles.date_of_birth::date)) < 35 THEN '25-34'
          WHEN date_part('year', age(profiles.date_of_birth::date)) < 45 THEN '35-44'
          WHEN date_part('year', age(profiles.date_of_birth::date)) < 55 THEN '45-54'
          ELSE '55+'
        END
      `)

  const ageResult = await (mode === "attended" && profileIds!.length > 0
    ? ageQuery.where("profiles.id", "in", profileIds!)
    : ageQuery
  ).execute()

  // Calculate totals for percentages
  const genderTotal = genderResult.reduce((sum, r) => sum + r.count, 0)
  const orientationTotal = orientationResult.reduce((sum, r) => sum + r.count, 0)
  const raceTotal = raceResult.reduce((sum, r) => sum + r.count, 0)
  const ageTotal = ageResult.reduce((sum, r) => sum + r.count, 0)

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
    gender: toDistribution(genderResult, genderTotal),
    orientation: toDistribution(orientationResult, orientationTotal),
    race: toDistribution(raceResult, raceTotal),
    age: toDistribution(ageResult, ageTotal),
  }
}

import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"
import type {
  GrowthDataPoint,
  RetentionDataPoint,
  SeasonalityDataPoint,
} from "./dataviz.types"

export async function getGrowthData(): Promise<GrowthDataPoint[]> {
  const result = await kyselyDb
    .selectFrom("profiles")
    .select([
      sql<string>`to_char(date_trunc('month', created_at), 'YYYY-MM')`.as(
        "month"
      ),
      sql<number>`count(*)::int`.as("new_profiles"),
    ])
    .groupBy(sql`date_trunc('month', created_at)`)
    .orderBy(sql`date_trunc('month', created_at)`, "asc")
    .execute()

  let cumulative = 0
  return result.map((row) => {
    cumulative += row.new_profiles
    return {
      month: row.month,
      new_profiles: row.new_profiles,
      cumulative,
    }
  })
}

export async function getRetentionData(): Promise<RetentionDataPoint[]> {
  // Subquery: count attended events per profile
  const result = await kyselyDb
    .selectFrom(
      kyselyDb
        .selectFrom("event_participants")
        .innerJoin("events", "events.id", "event_participants.event_id")
        .where("event_participants.attendance_status", "=", "attended")
        .where("events.event_status", "=", "Completed")
        .groupBy("event_participants.profile_id")
        .select([
          "event_participants.profile_id",
          sql<number>`count(*)::int`.as("events_count"),
        ])
        .as("attended_counts")
    )
    .groupBy("attended_counts.events_count")
    .orderBy("attended_counts.events_count", "asc")
    .select([
      sql<number>`attended_counts.events_count`.as("events_attended"),
      sql<number>`count(*)::int`.as("num_people"),
    ])
    .execute()

  return result.map((row) => ({
    events_attended: row.events_attended,
    num_people: row.num_people,
  }))
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export async function getSeasonalityData(): Promise<SeasonalityDataPoint[]> {
  const result = await kyselyDb
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .where("events.event_status", "=", "Completed")
    .groupBy(sql`extract(month from events.time_event_start)`)
    .orderBy(sql`extract(month from events.time_event_start)`, "asc")
    .select([
      sql<number>`extract(month from events.time_event_start)::int`.as(
        "month_num"
      ),
      sql<number>`round(avg(
        (SELECT count(*) FROM event_participants ep WHERE ep.event_id = events.id)
      ))::int`.as("avg_inscritos"),
      sql<number>`round(avg(
        (SELECT count(*) FROM event_participants ep WHERE ep.event_id = events.id AND ep.attendance_status = 'attended')
      ))::int`.as("avg_compareceram"),
      sql<number>`round(avg(
        CASE
          WHEN events.total_spots > 0 THEN
            ((SELECT count(*) FROM event_participants ep WHERE ep.event_id = events.id AND ep.attendance_status = 'attended')::float / events.total_spots) * 100
          ELSE 0
        END
      ))::int`.as("avg_occupancy_pct"),
    ])
    .execute()

  return result.map((row) => ({
    month_name: MONTH_NAMES[row.month_num - 1] || `Month ${row.month_num}`,
    avg_inscritos: row.avg_inscritos,
    avg_compareceram: row.avg_compareceram,
    avg_occupancy_pct: row.avg_occupancy_pct,
  }))
}

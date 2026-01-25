import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"
import type { VeteranRookieDataPoint } from "./dataviz.types"

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

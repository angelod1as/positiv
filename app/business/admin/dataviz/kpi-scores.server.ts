import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"
import type { KpiScores } from "./dataviz.types"

export async function getKpiScores(): Promise<KpiScores> {
  // Profile counts
  const profileCounts = await kyselyDb
    .selectFrom("profiles")
    .select([
      sql<number>`count(*)::int`.as("total_profiles"),
      sql<number>`count(*) filter (where became_veteran_date is not null)::int`.as(
        "total_veterans"
      ),
    ])
    .executeTakeFirstOrThrow()

  // Event counts
  const eventCounts = await kyselyDb
    .selectFrom("events")
    .where("event_status", "=", "Completed")
    .select([
      sql<number>`count(*)::int`.as("total_events_completed"),
      sql<number>`coalesce(avg(ticket_price), 0)::int`.as("avg_ticket_price"),
    ])
    .executeTakeFirstOrThrow()

  // Unique attendees
  const attendeeCounts = await kyselyDb
    .selectFrom("event_participants")
    .innerJoin("events", "events.id", "event_participants.event_id")
    .where("events.event_status", "=", "Completed")
    .where("event_participants.attendance_status", "=", "attended")
    .select([
      sql<number>`count(distinct event_participants.profile_id)::int`.as(
        "total_unique_attendees"
      ),
    ])
    .executeTakeFirstOrThrow()

  // Average attendance per event
  const avgAttendance = await kyselyDb
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .where("events.event_status", "=", "Completed")
    .groupBy("events.id")
    .select([
      sql<number>`count(*) filter (where event_participants.attendance_status = 'attended')::int`.as(
        "attendance"
      ),
    ])
    .execute()

  const totalAttendance = avgAttendance.reduce(
    (sum, row) => sum + row.attendance,
    0
  )
  const avgAttendancePerEvent =
    eventCounts.total_events_completed > 0
      ? Math.round(totalAttendance / eventCounts.total_events_completed)
      : 0

  // Average occupancy percentage (exclude events with 0 total_spots)
  const occupancyData = await kyselyDb
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .where("events.event_status", "=", "Completed")
    .where("events.total_spots", ">", 0)
    .groupBy(["events.id", "events.total_spots"])
    .select([
      "events.total_spots",
      sql<number>`count(*) filter (where event_participants.attendance_status = 'attended')::int`.as(
        "attended"
      ),
    ])
    .execute()

  const occupancySum = occupancyData.reduce((sum, row) => {
    const spots = row.total_spots ?? 0
    return sum + (spots > 0 ? (row.attended / spots) * 100 : 0)
  }, 0)
  const avgOccupancyPct =
    occupancyData.length > 0 ? Math.round(occupancySum / occupancyData.length) : 0

  // Total revenue
  const revenueData = await kyselyDb
    .selectFrom("event_participants")
    .innerJoin("events", "events.id", "event_participants.event_id")
    .where("events.event_status", "=", "Completed")
    .select([sql<number>`coalesce(sum(event_participants.payment), 0)::int`.as("total_revenue")])
    .executeTakeFirstOrThrow()

  const avgRevenuePerEvent =
    eventCounts.total_events_completed > 0
      ? Math.round(revenueData.total_revenue / eventCounts.total_events_completed)
      : 0

  return {
    total_profiles: profileCounts.total_profiles,
    total_veterans: profileCounts.total_veterans,
    total_events_completed: eventCounts.total_events_completed,
    total_unique_attendees: attendeeCounts.total_unique_attendees,
    avg_attendance_per_event: avgAttendancePerEvent,
    avg_occupancy_pct: avgOccupancyPct,
    total_revenue: revenueData.total_revenue,
    avg_revenue_per_event: avgRevenuePerEvent,
    avg_ticket_price: eventCounts.avg_ticket_price,
  }
}

import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"
import type {
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
} from "./dataviz.types"

export async function getEventAttendanceData(): Promise<
  EventAttendanceDataPoint[]
> {
  const result = await kyselyDb
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .where("events.event_status", "=", "Completed")
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
      sql<number>`count(event_participants.id)::int`.as("inscritos"),
      sql<number>`count(*) filter (where event_participants.attendance_status = 'attended')::int`.as(
        "compareceram"
      ),
      sql<number>`count(*) filter (where event_participants.attendance_status = 'not-attended')::int`.as(
        "nao_foram"
      ),
      sql<number>`count(*) filter (where event_participants.attendance_status = 'will-not-go')::int`.as(
        "will_not_go"
      ),
      sql<number>`count(*) filter (where event_participants.attendance_status = 'skipped')::int`.as(
        "skipped"
      ),
      sql<number>`count(*) filter (where event_participants.was_selected_for_rotation = true)::int`.as(
        "rodizio"
      ),
      sql<number>`count(*) filter (where event_participants.spot_type = 'social')::int`.as(
        "vagas_sociais"
      ),
      sql<number>`count(*) filter (where event_participants.spot_type = 'staff')::int`.as(
        "staff"
      ),
    ])
    .execute()

  return result.map((row) => ({
    title: row.title ?? "",
    emoji: row.emoji ?? "",
    date: row.date ?? "",
    inscritos: row.inscritos,
    compareceram: row.compareceram,
    nao_foram: row.nao_foram,
    will_not_go: row.will_not_go,
    skipped: row.skipped,
    rodizio: row.rodizio,
    vagas_sociais: row.vagas_sociais,
    staff: row.staff,
  }))
}

export async function getEventRevenueData(): Promise<EventRevenueDataPoint[]> {
  const result = await kyselyDb
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .where("events.event_status", "=", "Completed")
    .groupBy([
      "events.id",
      "events.title",
      "events.emoji",
      "events.time_event_start",
      "events.ticket_price",
    ])
    .orderBy("events.time_event_start", "asc")
    .select([
      "events.title",
      "events.emoji",
      "events.time_event_start as date",
      "events.ticket_price",
      sql<number>`coalesce(sum(event_participants.payment), 0)::int`.as(
        "faturamento_total"
      ),
      sql<number>`count(*) filter (where event_participants.has_paid = true)::int`.as(
        "num_pagantes"
      ),
    ])
    .execute()

  return result.map((row) => ({
    title: row.title ?? "",
    emoji: row.emoji ?? "",
    date: row.date ?? "",
    faturamento_total: row.faturamento_total,
    ticket_price: Number(row.ticket_price ?? 0),
    num_pagantes: row.num_pagantes,
  }))
}

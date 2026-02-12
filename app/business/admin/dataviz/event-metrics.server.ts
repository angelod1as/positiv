import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"
import { DATAVIZ_EVENT_CUTOFF_DATE } from "~/lib/constants/constants"
import type {
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  ConversionFunnelDataPoint,
  OccupancyDataPoint,
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
    .where("events.time_event_start", ">=", DATAVIZ_EVENT_CUTOFF_DATE)
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
    date: row.date ? new Date(row.date).toISOString() : "",
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
    .where("events.time_event_start", ">=", DATAVIZ_EVENT_CUTOFF_DATE)
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
    date: row.date ? new Date(row.date).toISOString() : "",
    faturamento_total: row.faturamento_total,
    ticket_price: Number(row.ticket_price ?? 0),
    num_pagantes: row.num_pagantes,
  }))
}

export async function getConversionFunnelData(): Promise<
  ConversionFunnelDataPoint[]
> {
  const result = await kyselyDb
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .where("events.event_status", "=", "Completed")
    .where("events.time_event_start", ">=", DATAVIZ_EVENT_CUTOFF_DATE)
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
      sql<number>`count(*) filter (where event_participants.application_status = 'finalised')::int`.as(
        "finalizados"
      ),
      sql<number>`count(*) filter (where event_participants.has_paid = true)::int`.as(
        "pagaram"
      ),
      sql<number>`count(*) filter (where event_participants.attendance_status = 'attended')::int`.as(
        "compareceram"
      ),
    ])
    .execute()

  return result.map((row) => {
    const inscritos = row.inscritos
    return {
      title: row.title ?? "",
      emoji: row.emoji ?? "",
      date: row.date ? new Date(row.date).toISOString() : "",
      inscritos,
      finalizados: row.finalizados,
      pagaram: row.pagaram,
      compareceram: row.compareceram,
      pct_finalizados:
        inscritos > 0 ? Math.round((row.finalizados / inscritos) * 100) : 0,
      pct_pagaram:
        inscritos > 0 ? Math.round((row.pagaram / inscritos) * 100) : 0,
      pct_compareceram:
        inscritos > 0 ? Math.round((row.compareceram / inscritos) * 100) : 0,
    }
  })
}

export async function getOccupancyData(): Promise<OccupancyDataPoint[]> {
  const result = await kyselyDb
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .where("events.event_status", "=", "Completed")
    .where("events.time_event_start", ">=", DATAVIZ_EVENT_CUTOFF_DATE)
    .groupBy([
      "events.id",
      "events.title",
      "events.emoji",
      "events.time_event_start",
      "events.total_spots",
    ])
    .orderBy("events.time_event_start", "asc")
    .select([
      "events.title",
      "events.emoji",
      "events.time_event_start as date",
      "events.total_spots",
      sql<number>`count(*) filter (where event_participants.attendance_status = 'attended')::int`.as(
        "compareceram"
      ),
    ])
    .execute()

  return result.map((row) => {
    const totalSpots = row.total_spots ?? 0
    const compareceram = row.compareceram
    return {
      title: row.title ?? "",
      emoji: row.emoji ?? "",
      date: row.date ? new Date(row.date).toISOString() : "",
      compareceram,
      total_spots: totalSpots,
      occupancy_pct:
        totalSpots > 0 ? Math.round((compareceram / totalSpots) * 100) : 0,
    }
  })
}

import { sql } from "kysely"
import { db } from "~/lib/supabase/db.server"
import { type DatavizRange, fullDatavizRange } from "./dataviz-range"
import type {
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  ConversionFunnelDataPoint,
  OccupancyDataPoint,
  TimingDataPoint,
} from "./dataviz.types"

export async function getEventAttendanceData(
  range: DatavizRange = fullDatavizRange(),
): Promise<
  EventAttendanceDataPoint[]
> {
  const result = await db
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
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
      sql<number>`count(event_participants.id)::int`.as("inscritos"),
      sql<number>`count(*) filter (where event_participants.attendance_status = 'attended')::int`.as(
        "compareceram"
      ),
      sql<number>`count(*) filter (where event_participants.attendance_status = 'not-attended')::int`.as(
        "nao_foram"
      ),
      sql<number>`count(*) filter (where event_participants.attendance_status = 'withdrew')::int`.as(
        "withdrew"
      ),
      sql<number>`count(*) filter (where event_participants.attendance_status = 'not-selected')::int`.as(
        "not_selected"
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
    withdrew: row.withdrew,
    not_selected: row.not_selected,
    skipped: row.skipped,
    rodizio: row.rodizio,
    vagas_sociais: row.vagas_sociais,
    staff: row.staff,
  }))
}

export async function getEventRevenueData(
  range: DatavizRange = fullDatavizRange(),
): Promise<EventRevenueDataPoint[]> {
  const result = await db
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .leftJoin(
      "event_participant_payments as epp",
      "epp.event_participant_id",
      "event_participants.id"
    )
    .where("events.event_status", "=", "Completed")
    .where("events.time_event_start", ">=", range.from)
    .where("events.time_event_start", "<=", range.to)
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
      // Revenue is what was paid, less refunds. A refund takes the money back
      // and the payer with it: someone who was refunded is not coming.
      sql<number>`coalesce(sum(epp.net), 0)::int`.as("faturamento_total"),
      sql<number>`coalesce(sum(epp.paid_gross), 0)::int`.as(
        "faturamento_bruto"
      ),
      sql<number>`count(*) filter (where epp.has_paid)::int`.as("num_pagantes"),
      // The split goes by who took the money: an admin by hand, or Asaas.
      sql<number>`(
        select coalesce(sum(p.amount - coalesce(p.refund_amount, 0)), 0)
        from payments p
        join event_participants x on x.id = p.event_participant_id
        where x.event_id = events.id
          and p.kind = 'manual'
          and p.status in ('paid', 'refunded', 'partially_refunded')
      )::int`.as("faturamento_manual"),
      sql<number>`(
        select coalesce(sum(p.amount - coalesce(p.refund_amount, 0)), 0)
        from payments p
        join event_participants x on x.id = p.event_participant_id
        where x.event_id = events.id
          and p.kind = 'online'
          and p.status in ('paid', 'refunded', 'partially_refunded')
      )::int`.as("faturamento_asaas"),
      sql<number>`(
        select count(*)
        from payments p
        join event_participants x on x.id = p.event_participant_id
        where x.event_id = events.id
          and p.status in ('paid', 'partially_refunded')
      )::int`.as("pagamentos"),
      sql<number>`(
        select count(*)
        from payments p
        join event_participants x on x.id = p.event_participant_id
        where x.event_id = events.id
          and p.status in ('paid', 'partially_refunded')
          and p.method = 'credit_card'
      )::int`.as("pagamentos_cartao"),
    ])
    .execute()

  return result.map((row) => ({
    title: row.title ?? "",
    emoji: row.emoji ?? "",
    date: row.date ? new Date(row.date).toISOString() : "",
    faturamento_total: row.faturamento_total,
    faturamento_bruto: row.faturamento_bruto,
    ticket_price: Number(row.ticket_price ?? 0),
    num_pagantes: row.num_pagantes,
    faturamento_manual: row.faturamento_manual,
    faturamento_asaas: row.faturamento_asaas,
    pagamentos: row.pagamentos,
    pagamentos_cartao: row.pagamentos_cartao,
  }))
}

export async function getConversionFunnelData(
  range: DatavizRange = fullDatavizRange(),
): Promise<
  ConversionFunnelDataPoint[]
> {
  const result = await db
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .leftJoin(
      "event_participant_payments as epp",
      "epp.event_participant_id",
      "event_participants.id"
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
      sql<number>`count(event_participants.id)::int`.as("inscritos"),
      sql<number>`count(*) filter (where event_participants.application_status = 'finalised')::int`.as(
        "finalizados"
      ),
      sql<number>`count(*) filter (where epp.has_paid)::int`.as("pagaram"),
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

export async function getOccupancyData(
  range: DatavizRange = fullDatavizRange(),
): Promise<OccupancyDataPoint[]> {
  const result = await db
    .selectFrom("events")
    .leftJoin(
      "event_participants",
      "event_participants.event_id",
      "events.id"
    )
    .where("events.event_status", "=", "Completed")
    .where("events.time_event_start", ">=", range.from)
    .where("events.time_event_start", "<=", range.to)
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

export async function getTimingData(
  range: DatavizRange = fullDatavizRange(),
): Promise<TimingDataPoint[]> {
  const days = (moment: "event_participants.application_date" | "first_payments.first_paid_at") =>
    sql<string | null>`round((percentile_cont(0.5) within group (order by extract(epoch from (events.time_event_start - ${sql.raw(moment)})) / 86400))::numeric, 1)`

  const result = await db
    .selectFrom("events")
    .leftJoin("event_participants", (join) =>
      join
        .onRef("event_participants.event_id", "=", "events.id")
        .on("event_participants.spot_type", "<>", "staff")
    )
    .leftJoin(
      (eb) =>
        eb
          .selectFrom("payments")
          .where("payments.paid_at", "is not", null)
          .groupBy("payments.event_participant_id")
          .select([
            "payments.event_participant_id",
            sql<string>`min(payments.paid_at)`.as("first_paid_at"),
          ])
          .as("first_payments"),
      (join) =>
        join.onRef(
          "first_payments.event_participant_id",
          "=",
          "event_participants.id"
        )
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
      days("event_participants.application_date").as("dias_inscricao"),
      days("first_payments.first_paid_at").as("dias_pagamento"),
    ])
    .execute()

  const asNumber = (value: string | null) => (value === null ? null : Number(value))
  return result.map((row) => ({
    title: row.title ?? "",
    emoji: row.emoji ?? "",
    date: row.date ? new Date(row.date).toISOString() : "",
    dias_inscricao: asNumber(row.dias_inscricao),
    dias_pagamento: asNumber(row.dias_pagamento),
  }))
}

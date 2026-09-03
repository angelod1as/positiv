import type { Selectable } from "kysely"
import { kyselyDb } from "~/kysely-db"
import type { ParticipantPaymentTotals } from "~types/database/entities.types"
import type { Database } from "~types/database/kysely.types"

export type PaymentRow = Selectable<Database["payments"]>

export type ParticipantPayments = {
  payments: PaymentRow[]
  totals: ParticipantPaymentTotals
  active: PaymentRow | null
}

export const ACTIVE_PAYMENT_STATUSES = ["pending", "awaiting_payment"] as const

const isActive = (payment: PaymentRow): boolean =>
  (ACTIVE_PAYMENT_STATUSES as readonly string[]).includes(payment.status)

export async function getPaymentsForParticipant(
  eventParticipantId: string,
): Promise<ParticipantPayments> {
  const [payments, totals] = await Promise.all([
    kyselyDb
      .selectFrom("payments")
      .selectAll()
      .where("event_participant_id", "=", eventParticipantId)
      .orderBy("created_at", "desc")
      .execute(),
    kyselyDb
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", eventParticipantId)
      .executeTakeFirst(),
  ])

  return {
    payments,
    totals: {
      paid_gross: totals?.paid_gross ?? 0,
      refunded: totals?.refunded ?? 0,
      fee: totals?.fee ?? 0,
      net: totals?.net ?? 0,
      payment_status: totals?.current_status ?? null,
      active_payment_id: totals?.active_payment_id ?? null,
    },
    active: payments.find(isActive) ?? null,
  }
}

/**
 * Every payment of one event, grouped by participant, so the grid can open the
 * modal on any row without a round trip. One query for a page that already
 * loads every participant.
 */
export async function getPaymentsForEvent(
  eventId: string,
): Promise<Record<string, PaymentRow[]>> {
  const payments = await kyselyDb
    .selectFrom("payments")
    .selectAll("payments")
    .innerJoin(
      "event_participants",
      "event_participants.id",
      "payments.event_participant_id",
    )
    .where("event_participants.event_id", "=", eventId)
    .orderBy("payments.created_at", "desc")
    .execute()

  return payments.reduce<Record<string, PaymentRow[]>>((grouped, payment) => {
    const forParticipant = grouped[payment.event_participant_id] ?? []
    forParticipant.push(payment)
    grouped[payment.event_participant_id] = forParticipant
    return grouped
  }, {})
}

import { isPaymentSystemEnabled } from "~/lib/features.server"
import type { PaymentMethod } from "~/integrations/asaas/types"
import { kyselyDb } from "~/kysely-db"

export type ValidatePaymentTokenResult =
  | { status: "not_found" }
  | { status: "expired"; data: { eventTitle: string; eventEmoji: string | null } }
  | { status: "already_paid"; data: { eventTitle: string; eventEmoji: string | null } }
  | { status: "no_valid_charges"; data: { eventTitle: string; eventEmoji: string | null } }
  | {
      status: "success"
      data: {
        eventTitle: string
        eventEmoji: string | null
        participantName: string
        paymentOptions: PaymentOption[]
      }
    }

export interface PaymentOption {
  method: PaymentMethod
  amount: number
  invoiceUrl: string
  installments?: number
}

export async function validatePaymentToken(
  token: string
): Promise<ValidatePaymentTokenResult> {
  if (!isPaymentSystemEnabled()) {
    return { status: "not_found" }
  }

  const participant = await kyselyDb
    .selectFrom("event_participants")
    .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
    .innerJoin("events", "events.id", "event_participants.event_id")
    .select([
      "event_participants.id as participant_id",
      "event_participants.profile_id",
      "event_participants.event_id",
      "event_participants.has_paid",
      "event_participants.payment_link_expires_at",
      "profiles.full_name",
      "profiles.social_name",
      "events.title as event_title",
      "events.emoji as event_emoji",
    ])
    .where("event_participants.payment_link_token", "=", token)
    .executeTakeFirst()

  if (!participant) {
    return { status: "not_found" }
  }

  const eventTitle = participant.event_title ?? "Evento"
  const eventEmoji = participant.event_emoji

  if (
    participant.payment_link_expires_at &&
    new Date(participant.payment_link_expires_at) < new Date()
  ) {
    return { status: "expired", data: { eventTitle, eventEmoji } }
  }

  if (participant.has_paid) {
    return { status: "already_paid", data: { eventTitle, eventEmoji } }
  }

  const transactions = await kyselyDb
    .selectFrom("payment_transactions")
    .select([
      "payment_method",
      "amount",
      "status",
      "installments",
      "asaas_payment_data",
    ])
    .where("event_participant_id", "=", participant.participant_id)
    .where("event_id", "=", participant.event_id)
    .execute()

  const hasConfirmed = transactions.some((t) => t.status === "confirmed")
  if (hasConfirmed) {
    return { status: "already_paid", data: { eventTitle, eventEmoji } }
  }

  const pendingTransactions = transactions.filter((t) => t.status === "pending")

  if (pendingTransactions.length === 0) {
    return { status: "no_valid_charges", data: { eventTitle, eventEmoji } }
  }

  const displayName = participant.social_name ?? participant.full_name ?? "Participante"

  const validTransactions = pendingTransactions.filter((t) => {
    if (!t.asaas_payment_data) return false
    const data = t.asaas_payment_data as Record<string, unknown>
    return typeof data.invoiceUrl === "string"
  })

  if (validTransactions.length === 0) {
    return { status: "no_valid_charges", data: { eventTitle, eventEmoji } }
  }

  const paymentOptions: PaymentOption[] = validTransactions.map((t) => {
    const paymentData = t.asaas_payment_data as unknown as { invoiceUrl: string }
    return {
      method: t.payment_method as PaymentMethod,
      amount: t.amount,
      invoiceUrl: paymentData.invoiceUrl,
      ...(t.installments ? { installments: t.installments } : {}),
    }
  })

  return {
    status: "success",
    data: {
      eventTitle,
      eventEmoji,
      participantName: displayName,
      paymentOptions,
    },
  }
}

import { composable } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"
import {
  cancelAsaasPayment,
  createAsaasCustomer,
  createAsaasPayment,
} from "./asaas-client.server"
import { buildPaymentOptions } from "./payment-pricing.server"

export const PAYMENT_REQUEST_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000

export async function createPaymentRequest({
  eventParticipantId,
  ticketPrice,
  paymentMode,
}: {
  eventParticipantId: string
  ticketPrice: number
  paymentMode?: string
}) {
  const expiresAt = new Date(Date.now() + PAYMENT_REQUEST_EXPIRY_MS)

  return kyselyDb
    .insertInto("payment_requests")
    .values({
      event_participant_id: eventParticipantId,
      amount: ticketPrice,
      status: "pending",
      payment_mode: paymentMode ?? "manual",
      expires_at: expiresAt.toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()
}

export const getLatestPaymentRequest = composable(
  async (eventParticipantId: string) => {
    const result = await kyselyDb
      .selectFrom("payment_requests")
      .selectAll()
      .where("event_participant_id", "=", eventParticipantId)
      .orderBy("created_at", "desc")
      .executeTakeFirst()
    return result ?? null
  },
)

export type PaymentRequestRow = NonNullable<
  Extract<Awaited<ReturnType<typeof getLatestPaymentRequest>>, { success: true }>["data"]
>

export async function getActivePaymentRequest(eventParticipantId: string) {
  const result = await kyselyDb
    .selectFrom("payment_requests")
    .selectAll()
    .where("event_participant_id", "=", eventParticipantId)
    .where("status", "not in", ["expired", "cancelled"])
    .where("expires_at", ">", new Date().toISOString())
    .executeTakeFirst()
  return result ?? null
}

export async function cancelActivePaymentRequest(eventParticipantId: string) {
  const active = await getActivePaymentRequest(eventParticipantId)
  if (!active) return

  if (active.asaas_payment_id) {
    try {
      await cancelAsaasPayment(active.asaas_payment_id)
      logger.info("Cancelled Asaas payment before creating new request", {
        paymentRequestId: active.id,
        asaasPaymentId: active.asaas_payment_id,
      })
    } catch (error) {
      logger.error("Failed to cancel Asaas payment, proceeding with local cancellation", {
        paymentRequestId: active.id,
        asaasPaymentId: active.asaas_payment_id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  await kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", active.id)
    .execute()
}

function parsePaymentOption(paymentOption: string) {
  if (paymentOption === "PIX") {
    return { billingType: "PIX" as const, installments: 1 }
  }

  const match = paymentOption.match(/^CC_(\d+)$/)
  if (!match) throw new Error(`Invalid payment option: ${paymentOption}`)

  return {
    billingType: "CREDIT_CARD" as const,
    installments: Number(match[1]),
  }
}

export async function confirmPaymentChoice({
  eventParticipantId,
  paymentOption,
}: {
  eventParticipantId: string
  paymentOption: string
}) {
  const paymentRequest = await kyselyDb
    .selectFrom("payment_requests")
    .selectAll()
    .where("event_participant_id", "=", eventParticipantId)
    .where("status", "not in", ["expired", "cancelled"])
    .where("expires_at", ">", new Date().toISOString())
    .executeTakeFirst()

  if (!paymentRequest) {
    throw new Error("No active payment request found")
  }

  const amount = Number(paymentRequest.amount)

  const profile = await kyselyDb
    .selectFrom("event_participants")
    .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
    .select(["profiles.full_name", "profiles.cpf", "profiles.email", "profiles.phone"])
    .where("event_participants.id", "=", eventParticipantId)
    .executeTakeFirstOrThrow()

  if (!profile.cpf) {
    throw new Error("CPF is required for payment. Please update your profile.")
  }

  const customer = await createAsaasCustomer({
    name: profile.full_name ?? "Participante",
    cpfCnpj: profile.cpf,
    email: profile.email ?? undefined,
    phone: profile.phone ? String(profile.phone) : undefined,
  })

  const { billingType, installments } = parsePaymentOption(paymentOption)

  const options = buildPaymentOptions(amount)
  const option = options.find((o) => o.value === paymentOption)
  if (!option) throw new Error(`Invalid payment option: ${paymentOption}`)

  const dueDate = new Date(Date.now() + PAYMENT_REQUEST_EXPIRY_MS)
    .toISOString()
    .split("T")[0]

  const payment = await createAsaasPayment({
    customerId: customer.id,
    billingType,
    value: option.totalReais,
    dueDate,
    description: "Positiv — Ingresso",
    installmentCount:
      billingType === "CREDIT_CARD" && installments > 1
        ? installments
        : undefined,
  })

  await kyselyDb
    .updateTable("payment_requests")
    .set({
      asaas_customer_id: customer.id,
      asaas_payment_id: payment.id,
      payment_mode: "automatic",
      payment_method: billingType,
      installment_count: installments,
      amount: option.totalReais,
      invoice_url: payment.invoiceUrl,
      status: "awaiting_payment",
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", paymentRequest.id)
    .execute()

  return { invoiceUrl: payment.invoiceUrl }
}

export async function markPaymentAsExpired(paymentRequestId: string) {
  await kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", paymentRequestId)
    .execute()
}

export async function markManualPaymentPaid(eventParticipantId: string) {
  const now = new Date().toISOString()
  const result = await kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "paid",
      paid_at: now,
      updated_at: now,
    })
    .where("event_participant_id", "=", eventParticipantId)
    .where("payment_mode", "=", "manual")
    .where("status", "in", ["pending", "awaiting_payment"])
    .returningAll()
    .executeTakeFirst()

  if (!result) {
    throw new Error("No pending manual payment request found for this participant")
  }

  return result
}

export async function markManualPaymentRefunded(eventParticipantId: string) {
  const now = new Date().toISOString()
  const result = await kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "refunded",
      refunded_at: now,
      updated_at: now,
    })
    .where("event_participant_id", "=", eventParticipantId)
    .where("payment_mode", "=", "manual")
    .where("status", "=", "paid")
    .returningAll()
    .executeTakeFirst()

  if (!result) {
    throw new Error("No paid manual payment request found for this participant")
  }

  return result
}

export async function updatePaymentRequestAmount(eventParticipantId: string, amount: number) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero")
  }

  const result = await kyselyDb
    .updateTable("payment_requests")
    .set({
      amount,
      updated_at: new Date().toISOString(),
    })
    .where("event_participant_id", "=", eventParticipantId)
    .where("payment_mode", "=", "manual")
    .where("status", "in", ["pending", "awaiting_payment"])
    .returningAll()
    .executeTakeFirst()

  if (!result) {
    throw new Error("No pending manual payment request found for this participant")
  }

  return result
}

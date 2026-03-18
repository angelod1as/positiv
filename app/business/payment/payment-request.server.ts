import { composable } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import {
  createAsaasCustomer,
  createAsaasPayment,
} from "./asaas-client.server"
import { buildPaymentOptions } from "./payment-pricing.server"

export const PAYMENT_REQUEST_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000

export async function createPaymentRequest({
  eventParticipantId,
  ticketPrice,
  billingType,
}: {
  eventParticipantId: string
  ticketPrice: number
  billingType?: string
}) {
  const expiresAt = new Date(Date.now() + PAYMENT_REQUEST_EXPIRY_MS)

  return kyselyDb
    .insertInto("payment_requests")
    .values({
      event_participant_id: eventParticipantId,
      amount: ticketPrice,
      status: "pending",
      billing_type: billingType ?? null,
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
  ticketPrice,
}: {
  eventParticipantId: string
  paymentOption: string
  ticketPrice: number
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

  const options = buildPaymentOptions(ticketPrice)
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
      billing_type: billingType,
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

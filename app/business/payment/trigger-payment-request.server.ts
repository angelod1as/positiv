import { composable } from "composable-functions"
import { env } from "~/env.server"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import { refundAsaasPayment } from "./asaas-client.server"
import {
  cancelActivePaymentRequest,
  createPaymentRequest,
} from "./payment-request.server"
import { sendPaymentLinkEmail } from "./send-payment-link-email.server"

/**
 * Called from admin action handlers when application_status changes.
 * Only triggers payment when status is "sent_payment_data".
 * Returns { triggered: false } for other statuses,
 * or { triggered: true, success, errors } when payment was attempted.
 */
export async function handlePaymentStatusChange(fields: {
  applicationStatus: string | undefined
  eventParticipantId: string
  eventId: string
  profileId: string
  customAmount?: number
  paymentMode?: string
}) {
  if (fields.applicationStatus !== "sent_payment_data") {
    return { triggered: false as const }
  }

  const result = await resolvePaymentRequest(
    fields.eventParticipantId,
    fields.eventId,
    fields.profileId,
    fields.customAmount,
    fields.paymentMode,
  )

  if (!result.success) {
    logger.error("Failed to resolve payment request", {
      errors: result.errors,
      eventId: fields.eventId,
      profileId: fields.profileId,
    })
  }

  return { triggered: true as const, ...result }
}

export const resolvePaymentRequest = composable(
  async (
    eventParticipantId: string,
    eventId: string,
    profileId: string,
    customAmount?: number,
    paymentMode?: string,
  ) => {
    const isPaymentSystemOnline = paymentMode
      ? paymentMode === "automatic"
      : env().paymentSystemOnline

    const event = await kyselyDb
      .selectFrom("events")
      .select(["id", "title", "ticket_price"])
      .where("id", "=", eventId)
      .executeTakeFirstOrThrow()

    const amount = customAmount ?? Number(event.ticket_price)
    if (!amount) {
      throw new Error(`Event ${eventId} has no ticket_price configured and no custom amount provided`)
    }

    await cancelActivePaymentRequest(eventParticipantId)

    const paymentRequest = await createPaymentRequest({
      eventParticipantId,
      ticketPrice: amount,
      paymentMode: isPaymentSystemOnline ? "automatic" : "manual",
    })

    if (!isPaymentSystemOnline) {
      logger.info("Payment request created as manual (payment system offline)", {
        eventParticipantId,
        paymentRequestId: paymentRequest.id,
      })
      return paymentRequest
    }

    const profile = await kyselyDb
      .selectFrom("profiles")
      .select(["id", "email", "full_name", "cpf"])
      .where("id", "=", profileId)
      .executeTakeFirstOrThrow()

    if (!profile.cpf) {
      throw new Error(`Profile ${profileId} has no CPF. Payment requires a valid CPF.`)
    }

    const { appUrl } = env()
    const paymentUrl = `${appUrl}${paths.payment.PAYMENT(eventParticipantId)}`

    await sendPaymentLinkEmail({
      participantEmail: profile.email,
      participantName: profile.full_name ?? "Participante",
      eventName: event.title ?? "Evento Positiv",
      ticketPrice: Number(paymentRequest.amount),
      paymentUrl,
      expiresAt: new Date(paymentRequest.expires_at),
    })

    logger.info("Payment request resolved", {
      eventParticipantId,
      paymentRequestId: paymentRequest.id,
    })

    return paymentRequest
  },
)

export const processRefund = composable(
  async (eventParticipantId: string) => {
    const paymentRequest = await kyselyDb
      .selectFrom("payment_requests")
      .selectAll()
      .where("event_participant_id", "=", eventParticipantId)
      .where("status", "=", "paid")
      .executeTakeFirst()

    if (!paymentRequest) {
      throw new Error("No paid payment request found for this participant")
    }

    if (!paymentRequest.asaas_payment_id) {
      throw new Error("Payment request has no Asaas payment ID — cannot refund")
    }

    const now = new Date().toISOString()

    // Optimistic: mark as refunded in DB first
    await kyselyDb
      .updateTable("payment_requests")
      .set({
        status: "refunded",
        refund_amount: paymentRequest.amount,
        refunded_at: now,
        updated_at: now,
      })
      .where("id", "=", paymentRequest.id)
      .execute()

    try {
      await refundAsaasPayment(paymentRequest.asaas_payment_id)
    } catch (error) {
      // Rollback DB to paid if Asaas fails
      await kyselyDb
        .updateTable("payment_requests")
        .set({
          status: "paid",
          refund_amount: 0,
          refunded_at: null,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", paymentRequest.id)
        .execute()

      logger.error("Asaas refund failed, rolled back DB status to paid", {
        paymentRequestId: paymentRequest.id,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }

    logger.info("Payment refunded", {
      paymentRequestId: paymentRequest.id,
      eventParticipantId,
      amount: paymentRequest.amount,
    })
  },
)

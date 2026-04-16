import { composable } from "composable-functions"
import { env } from "~/env.server"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import {
  cancelActivePaymentRequest,
  createPaymentRequest,
} from "./payment-request.server"
import { sendPaymentLinkEmail } from "./send-payment-link-email.server"

export async function handlePaymentStatusChange(fields: {
  applicationStatus: string | undefined
  eventParticipantId: string
  eventId: string
  profileId: string
  customAmount?: number
  paymentMode?: "automatic" | "manual"
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
    paymentMode?: "automatic" | "manual",
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

    try {
      await sendPaymentLinkEmail({
        participantEmail: profile.email,
        participantName: profile.full_name ?? "Participante",
        eventName: event.title ?? "Evento Positiv",
        ticketPrice: Number(paymentRequest.amount),
        paymentUrl,
        expiresAt: new Date(paymentRequest.expires_at),
      })
    } catch (emailError) {
      logger.error("Failed to send payment link email (non-fatal)", {
        eventParticipantId,
        paymentRequestId: paymentRequest.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      })
    }

    logger.info("Payment request resolved", {
      eventParticipantId,
      paymentRequestId: paymentRequest.id,
    })

    return paymentRequest
  },
)

import { composable } from "composable-functions"
import { env } from "~/env.server"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import {
  createPaymentRequest,
  getActivePaymentRequest,
} from "./payment-request.server"
import { sendPaymentLinkEmail } from "./send-payment-link-email.server"

export const resolvePaymentRequest = composable(
  async (
    eventParticipantId: string,
    eventId: string,
    profileId: string,
  ) => {
    if (!env().paymentSystemOnline) return

    const event = await kyselyDb
      .selectFrom("events")
      .select(["id", "title", "ticket_price"])
      .where("id", "=", eventId)
      .executeTakeFirstOrThrow()

    if (!event.ticket_price) {
      throw new Error(`Event ${eventId} has no ticket_price configured`)
    }

    const profile = await kyselyDb
      .selectFrom("profiles")
      .select(["id", "email", "full_name", "cpf"])
      .where("id", "=", profileId)
      .executeTakeFirstOrThrow()

    if (!profile.cpf) {
      throw new Error(`Profile ${profileId} has no CPF. Payment requires a valid CPF.`)
    }

    const activeRequest = await getActivePaymentRequest(eventParticipantId)
    const paymentRequest =
      activeRequest ??
      (await createPaymentRequest({
        eventParticipantId,
        ticketPrice: Number(event.ticket_price),
      }))

    const { appUrl } = env()
    const paymentUrl = `${appUrl}${paths.payment.PAYMENT(eventParticipantId)}`

    await sendPaymentLinkEmail({
      participantEmail: profile.email,
      participantName: profile.full_name ?? "Participante",
      eventName: event.title ?? "Evento Positiv",
      ticketPrice: Number(event.ticket_price),
      paymentUrl,
      expiresAt: new Date(paymentRequest.expires_at),
    })

    logger.info("Payment request resolved", {
      eventParticipantId,
      paymentRequestId: paymentRequest.id,
      reused: !!activeRequest,
    })

    return paymentRequest
  },
)

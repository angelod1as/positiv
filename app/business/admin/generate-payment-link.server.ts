import { randomUUID } from "node:crypto"
import { addHours } from "date-fns"
import { env } from "~/env.server"
import { getOrCreateAsaasCustomer } from "~/integrations/asaas/client.server"
import {
  BASE_PRICE,
  formatCentavos,
  PAYMENT_LINK_EXPIRY_HOURS,
  MAX_INSTALLMENTS,
} from "~/integrations/asaas/constants"
import { calculatePaymentPrice } from "~/business/payment/calculate-payment-price"
import { formatPaymentLinkMail } from "~/business/email/format-payment-link-mail"
import { getPaymentLinkEmailSubject } from "~/business/email/templates/payment-link-email.template"
import { sendEmail } from "~/business/email/send-email"
import { isPaymentSystemEnabled } from "~/lib/features.server"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"

export interface GeneratePaymentLinkParams {
  profileId: string
  eventId: string
  adminProfileId: string
}

export interface GeneratePaymentLinkResult {
  token: string
  whatsappMessage: string
}

export async function generatePaymentLink(
  params: GeneratePaymentLinkParams,
): Promise<GeneratePaymentLinkResult> {
  if (!isPaymentSystemEnabled()) {
    throw new Error("Payment system is not enabled")
  }

  const appUrl = env().appUrl
  if (!appUrl) {
    throw new Error("APP_URL is not configured")
  }

  const participant = await kyselyDb
    .selectFrom("event_participants")
    .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
    .innerJoin("events", "events.id", "event_participants.event_id")
    .select([
      "event_participants.id as participant_id",
      "event_participants.profile_id",
      "event_participants.event_id",
      "event_participants.spot_type",
      "event_participants.has_paid",
      "event_participants.payment_link_token",
      "event_participants.payment_link_expires_at",
      "profiles.full_name",
      "profiles.social_name",
      "profiles.email",
      "profiles.cpf",
      "events.title as event_title",
      "events.emoji as event_emoji",
    ])
    .where("event_participants.profile_id", "=", params.profileId)
    .where("event_participants.event_id", "=", params.eventId)
    .executeTakeFirst()

  if (!participant) {
    throw new Error("Participant not found")
  }

  if (participant.spot_type !== "regular") {
    throw new Error("Only regular spot participants can generate payment links")
  }

  if (participant.has_paid) {
    throw new Error("Participant is already marked as paid")
  }

  const confirmedPayment = await kyselyDb
    .selectFrom("payment_transactions")
    .select("id")
    .where("event_participant_id", "=", participant.participant_id)
    .where("status", "=", "confirmed")
    .executeTakeFirst()

  if (confirmedPayment) {
    throw new Error("Participant already has a confirmed payment")
  }

  const hasUnexpiredLink =
    participant.payment_link_token &&
    participant.payment_link_expires_at &&
    new Date(participant.payment_link_expires_at) > new Date()

  if (hasUnexpiredLink) {
    throw new Error("An unexpired payment link already exists")
  }

  if (!participant.cpf) {
    throw new Error("Participant profile must have a CPF")
  }

  if (!participant.full_name) {
    throw new Error("Participant profile must have a name")
  }

  if (!participant.event_title) {
    throw new Error("Event must have a title")
  }

  const token = randomUUID()
  const now = new Date()
  const expiresAt = addHours(now, PAYMENT_LINK_EXPIRY_HOURS)

  const strippedCpf = participant.cpf.replace(/\D/g, "")
  const displayName = participant.social_name ?? participant.full_name
  const eventTitle = participant.event_title

  await getOrCreateAsaasCustomer({
    name: displayName,
    cpfCnpj: strippedCpf,
    email: participant.email ?? undefined,
    notificationDisabled: true,
  })

  const paymentLink = `${appUrl}/payment/${token}`

  await kyselyDb
    .updateTable("event_participants")
    .set({
      payment_link_token: token,
      payment_link_generated_at: now.toISOString(),
      payment_link_expires_at: expiresAt.toISOString(),
    })
    .where("id", "=", participant.participant_id)
    .execute()

  try {
    const { html, text } = await formatPaymentLinkMail(
      displayName,
      eventTitle,
      participant.event_emoji,
      paymentLink,
      expiresAt,
    )

    const subject = getPaymentLinkEmailSubject(
      eventTitle,
      participant.event_emoji,
    )

    if (participant.email) {
      const emailResult = await sendEmail({
        to: participant.email,
        subject,
        html,
        text,
      })

      if (!emailResult.success) {
        logger.error("Failed to send payment link email:", { errors: emailResult.errors })
      }
    }
  } catch (error) {
    logger.error("Error sending payment link email:", { error })
  }

  const pixAmount = formatCentavos(calculatePaymentPrice("pix", 1).totalAmount)
  const basePrice = formatCentavos(BASE_PRICE)

  const whatsappMessage = [
    `Olá ${displayName}! 🎉`,
    "",
    `Seu link de pagamento para o evento *${eventTitle}* está pronto:`,
    "",
    `💰 *Pix*: R$ ${pixAmount}`,
    `💳 *Cartão*: R$ ${basePrice} (parcele em até ${MAX_INSTALLMENTS}x no cartão)`,
    "",
    `🔗 ${paymentLink}`,
    "",
    `⏰ O link expira em ${PAYMENT_LINK_EXPIRY_HOURS} horas.`,
  ].join("\n")

  return {
    token,
    whatsappMessage,
  }
}

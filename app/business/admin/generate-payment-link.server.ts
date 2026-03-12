import { randomUUID } from "node:crypto"
import { addHours } from "date-fns"
import { env } from "~/env.server"
import {
  getOrCreateAsaasCustomer,
  createPaymentCharge,
  deletePayment,
} from "~/integrations/asaas/client.server"
import {
  formatCentavos,
  PAYMENT_LINK_EXPIRY_HOURS,
  PAYMENT_METHOD_CONFIG,
} from "~/integrations/asaas/constants"
import { formatPaymentLinkMail } from "~/business/email/format-payment-link-mail"
import { getPaymentLinkEmailSubject } from "~/business/email/templates/payment-link-email.template"
import { sendEmail } from "~/business/email/send-email"
import { isPaymentSystemEnabled } from "~/lib/features.server"
import { kyselyDb } from "~/kysely-db"

export interface GeneratePaymentLinkParams {
  profileId: string
  eventId: string
  adminProfileId: string
}

export interface GeneratePaymentLinkResult {
  token: string
  pixInvoiceUrl: string
  creditInvoiceUrl: string
  whatsappMessage: string
}

export async function generatePaymentLink(
  params: GeneratePaymentLinkParams
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
  const dueDate = expiresAt.toISOString().split("T")[0]

  const strippedCpf = participant.cpf.replace(/\D/g, "")
  const displayName = participant.social_name ?? participant.full_name
  const eventTitle = participant.event_title

  const customer = await getOrCreateAsaasCustomer({
    name: displayName,
    cpfCnpj: strippedCpf,
    email: participant.email ?? undefined,
    notificationDisabled: true,
  })

  const paymentLink = `${appUrl}/payment/${token}`

  const [pixPayment, creditPayment] = await Promise.all([
    createPaymentCharge({
      paymentMethod: "pix",
      customer: customer.id,
      dueDate,
      description: `Positiv - ${eventTitle}`,
      externalReference: token,
      callback: { successUrl: `${appUrl}/payment/${token}/success`, autoRedirect: true },
    }),
    createPaymentCharge({
      paymentMethod: "credit_card",
      customer: customer.id,
      dueDate,
      description: `Positiv - ${eventTitle}`,
      externalReference: token,
      callback: { successUrl: `${appUrl}/payment/${token}/success`, autoRedirect: true },
    }),
  ])

  try {
    await kyselyDb.transaction().execute(async (trx) => {
      await trx
        .deleteFrom("payment_transactions")
        .where("event_participant_id", "=", participant.participant_id)
        .where("status", "=", "pending")
        .execute()

      await trx
        .insertInto("payment_transactions")
        .values([
          {
            event_participant_id: participant.participant_id,
            profile_id: params.profileId,
            event_id: params.eventId,
            asaas_payment_id: pixPayment.id,
            asaas_customer_id: customer.id,
            asaas_payment_data: pixPayment as unknown as string,
            payment_method: "pix",
            amount: PAYMENT_METHOD_CONFIG.pix.amount,
            status: "pending",
            created_by: params.adminProfileId,
          },
          {
            event_participant_id: participant.participant_id,
            profile_id: params.profileId,
            event_id: params.eventId,
            asaas_payment_id: creditPayment.id,
            asaas_customer_id: customer.id,
            asaas_payment_data: creditPayment as unknown as string,
            payment_method: "credit_card",
            amount: PAYMENT_METHOD_CONFIG.credit_card.amount,
            installments: PAYMENT_METHOD_CONFIG.credit_card.installmentCount,
            status: "pending",
            created_by: params.adminProfileId,
          },
        ])
        .execute()

      await trx
        .updateTable("event_participants")
        .set({
          payment_link_token: token,
          payment_link_generated_at: now.toISOString(),
          payment_link_expires_at: expiresAt.toISOString(),
        })
        .where("id", "=", participant.participant_id)
        .execute()
    })
  } catch (error) {
    const cleanupResults = await Promise.allSettled([
      deletePayment(pixPayment.id),
      deletePayment(creditPayment.id),
    ])
    const failures = cleanupResults.filter((r) => r.status === "rejected")
    if (failures.length > 0) {
      console.error(
        "Failed to clean up Asaas charges after DB error:",
        failures.map((f) => (f as PromiseRejectedResult).reason),
      )
    }
    throw error
  }

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
        console.error("Failed to send payment link email:", emailResult.errors)
      }
    }
  } catch (error) {
    console.error("Error sending payment link email:", error)
  }

  const pixAmount = formatCentavos(PAYMENT_METHOD_CONFIG.pix.amount)
  const creditAmount = formatCentavos(PAYMENT_METHOD_CONFIG.credit_card.amount)
  const installments = PAYMENT_METHOD_CONFIG.credit_card.installmentCount

  const whatsappMessage = [
    `Olá ${displayName}! 🎉`,
    "",
    `Seu link de pagamento para o evento *${eventTitle}* está pronto:`,
    "",
    `💰 *Pix*: R$ ${pixAmount}`,
    `💳 *Cartão de crédito*: R$ ${creditAmount} (até ${installments}x)`,
    "",
    `🔗 ${paymentLink}`,
    "",
    `⏰ O link expira em ${PAYMENT_LINK_EXPIRY_HOURS} horas.`,
  ].join("\n")

  return {
    token,
    pixInvoiceUrl: pixPayment.invoiceUrl,
    creditInvoiceUrl: creditPayment.invoiceUrl,
    whatsappMessage,
  }
}

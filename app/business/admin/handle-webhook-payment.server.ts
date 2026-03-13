import { formatPaymentFailureMail } from "~/business/email/format-payment-failure-mail"
import { formatPaymentSuccessMail } from "~/business/email/format-payment-success-mail"
import { getPaymentFailureEmailSubject } from "~/business/email/templates/payment-failure-email.template"
import { getPaymentSuccessEmailSubject } from "~/business/email/templates/payment-success-email.template"
import { sendEmail } from "~/business/email/send-email"
import { deletePayment } from "~/integrations/asaas/client.server"
import {
  BILLING_TYPE_TO_PAYMENT_METHOD,
  formatCentavos,
  WEBHOOK_EVENT_TO_TRANSACTION_STATUS,
} from "~/integrations/asaas/constants"
import type { AsaasWebhookPayload } from "~/integrations/asaas/types"
import { env } from "~/env.server"
import { kyselyDb } from "~/kysely-db"

export async function handleWebhookPayment(
  payload: AsaasWebhookPayload,
): Promise<void> {
  const { event, payment } = payload

  const targetStatus = WEBHOOK_EVENT_TO_TRANSACTION_STATUS[event]
  if (!targetStatus) return

  const transaction = await kyselyDb
    .selectFrom("payment_transactions")
    .select([
      "id",
      "status",
      "event_participant_id",
      "event_id",
      "asaas_payment_id",
    ])
    .where("asaas_payment_id", "=", payment.id)
    .executeTakeFirst()

  if (!transaction) return

  if (transaction.status === targetStatus) return

  if (targetStatus === "confirmed") {
    await handleConfirmation(transaction, payload)
  } else if (targetStatus === "failed") {
    await handleFailure(transaction, payload)
  } else if (targetStatus === "refunded") {
    await handleRefund(transaction, payload)
  }
}

interface TransactionRecord {
  id: string
  status: string
  event_participant_id: string
  event_id: string
  asaas_payment_id: string
}

async function handleConfirmation(
  transaction: TransactionRecord,
  payload: AsaasWebhookPayload,
): Promise<void> {
  await kyselyDb.transaction().execute(async (trx) => {
    await trx
      .updateTable("payment_transactions")
      .set({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        asaas_payment_data: JSON.parse(JSON.stringify(payload.payment)),
      })
      .where("id", "=", transaction.id)
      .execute()

    await trx
      .updateTable("event_participants")
      .set({
        payment_transaction_id: transaction.id,
        has_paid: true,
      })
      .where("id", "=", transaction.event_participant_id)
      .execute()
  })

  await cancelSiblingTransactions(transaction)
  await sendConfirmationEmail(transaction, payload)
}

async function cancelSiblingTransactions(
  transaction: TransactionRecord,
): Promise<void> {
  const siblings = await kyselyDb
    .selectFrom("payment_transactions")
    .select(["id", "asaas_payment_id"])
    .where("event_participant_id", "=", transaction.event_participant_id)
    .where("id", "!=", transaction.id)
    .where("status", "=", "pending")
    .execute()

  for (const sibling of siblings) {
    try {
      await deletePayment(sibling.asaas_payment_id)
    } catch (error) {
      console.error(
        `Failed to delete sibling payment ${sibling.asaas_payment_id} in Asaas:`,
        error,
      )
    }

    try {
      await kyselyDb
        .updateTable("payment_transactions")
        .set({ status: "cancelled" })
        .where("id", "=", sibling.id)
        .execute()
    } catch (error) {
      console.error(
        `Failed to mark sibling ${sibling.id} as cancelled:`,
        error,
      )
    }
  }
}

async function sendConfirmationEmail(
  transaction: TransactionRecord,
  payload: AsaasWebhookPayload,
): Promise<void> {
  try {
    const participant = await kyselyDb
      .selectFrom("event_participants")
      .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .select([
        "profiles.full_name",
        "profiles.social_name",
        "profiles.email",
        "events.title as event_title",
        "events.emoji as event_emoji",
      ])
      .where("event_participants.id", "=", transaction.event_participant_id)
      .executeTakeFirst()

    if (!participant?.email || !participant.full_name) return

    const displayName = participant.social_name ?? participant.full_name
    const eventTitle = participant.event_title ?? ""
    const paymentMethod =
      BILLING_TYPE_TO_PAYMENT_METHOD[payload.payment.billingType] ?? "pix"
    const paymentMethodLabel = paymentMethod === "pix" ? "Pix" : "Cartão de crédito"
    const amount = formatCentavos(payload.payment.value * 100)
    const paymentDate = payload.payment.paymentDate ?? payload.payment.dateCreated

    const { html, text } = await formatPaymentSuccessMail(
      displayName,
      eventTitle,
      participant.event_emoji,
      paymentMethodLabel,
      amount,
      payload.payment.installmentNumber,
      paymentDate,
    )

    const subject = getPaymentSuccessEmailSubject(
      eventTitle,
      participant.event_emoji,
    )

    await sendEmail({
      to: participant.email,
      subject,
      html,
      text,
    })
  } catch (error) {
    console.error("Failed to send confirmation email:", error)
  }
}

async function handleFailure(
  transaction: TransactionRecord,
  payload: AsaasWebhookPayload,
): Promise<void> {
  await kyselyDb
    .updateTable("payment_transactions")
    .set({
      status: "failed",
      failed_at: new Date().toISOString(),
      asaas_payment_data: JSON.parse(JSON.stringify(payload.payment)),
    })
    .where("id", "=", transaction.id)
    .execute()

  if (payload.event === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED") {
    await sendFailureEmail(transaction)
  }
}

async function sendFailureEmail(
  transaction: TransactionRecord,
): Promise<void> {
  try {
    const participant = await kyselyDb
      .selectFrom("event_participants")
      .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .select([
        "profiles.full_name",
        "profiles.social_name",
        "profiles.email",
        "events.title as event_title",
        "events.emoji as event_emoji",
        "event_participants.payment_link_token",
      ])
      .where("event_participants.id", "=", transaction.event_participant_id)
      .executeTakeFirst()

    if (!participant?.email || !participant.full_name) return

    const displayName = participant.social_name ?? participant.full_name
    const eventTitle = participant.event_title ?? ""
    const paymentLink = participant.payment_link_token
      ? `${env().appUrl}/pagamento/${participant.payment_link_token}`
      : ""

    const { html, text } = await formatPaymentFailureMail(
      displayName,
      eventTitle,
      participant.event_emoji,
      null,
      paymentLink,
    )

    const subject = getPaymentFailureEmailSubject(
      eventTitle,
      participant.event_emoji,
    )

    await sendEmail({
      to: participant.email,
      subject,
      html,
      text,
    })
  } catch (error) {
    console.error("Failed to send failure email:", error)
  }
}

async function handleRefund(
  transaction: TransactionRecord,
  payload: AsaasWebhookPayload,
): Promise<void> {
  await kyselyDb
    .updateTable("payment_transactions")
    .set({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      refund_reason: "Reembolso processado via Asaas",
      asaas_payment_data: JSON.parse(JSON.stringify(payload.payment)),
    })
    .where("id", "=", transaction.id)
    .execute()
}

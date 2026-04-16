import { composable } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"
import {
  cancelAsaasPayment,
  createAsaasCustomer,
  createAsaasPayment,
} from "./asaas-client.server"
import { buildPaymentOptions, MAX_INSTALLMENTS } from "./payment-pricing.server"
import { sendPaymentRefundEmail } from "./send-payment-refund-email.server"

export const PAYMENT_REQUEST_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000

export async function createPaymentRequest({
  eventParticipantId,
  ticketPrice,
  paymentMode,
}: {
  eventParticipantId: string
  ticketPrice: number
  paymentMode?: "automatic" | "manual"
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

  // Atomic guard: only cancel if status is still non-terminal. Using
  // returningAll() so executeTakeFirst() returns the row (or undefined
  // when a concurrent caller already changed the status) — never
  // Kysely's always-truthy UpdateResult.
  const updated = await kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", active.id)
    .where("status", "in", ["pending", "awaiting_payment"])
    .returningAll()
    .executeTakeFirst()

  if (!updated) {
    // Another concurrent process already changed the status (paid via
    // webhook, cancelled by another admin, etc.). Skip the Asaas cancel
    // to avoid clobbering a legitimate state transition.
    logger.info(
      "cancelActivePaymentRequest: status changed concurrently, skipping",
      { paymentRequestId: active.id },
    )
    return
  }

  if (updated.asaas_payment_id) {
    try {
      await cancelAsaasPayment(updated.asaas_payment_id)
      logger.info("Cancelled Asaas payment after local cancellation", {
        paymentRequestId: updated.id,
        asaasPaymentId: updated.asaas_payment_id,
      })
    } catch (error) {
      // Asaas refused the cancel (most likely the charge was already paid).
      // If we leave the local row as `cancelled`, the user could still pay
      // the live Asaas charge and our webhook handlers (which only flip
      // pending/awaiting_payment rows) would silently no-op. Roll the local
      // status back so the system stays consistent.
      const rolledBack = await kyselyDb
        .updateTable("payment_requests")
        .set({ status: active.status, updated_at: new Date().toISOString() })
        .where("id", "=", updated.id)
        .where("status", "=", "cancelled")
        .returningAll()
        .executeTakeFirst()

      if (!rolledBack) {
        logger.error(
          "Asaas cancel failed AND local rollback was a no-op — MANUAL RECONCILIATION REQUIRED",
          {
            paymentRequestId: updated.id,
            asaasPaymentId: updated.asaas_payment_id,
            originalStatus: active.status,
            error: error instanceof Error ? error.message : String(error),
          },
        )
      } else {
        logger.error(
          "Asaas cancel failed, rolled back local status — likely the charge was already paid",
          {
            paymentRequestId: updated.id,
            asaasPaymentId: updated.asaas_payment_id,
            restoredStatus: active.status,
            error: error instanceof Error ? error.message : String(error),
          },
        )
      }

      throw error
    }
  }
}

function parsePaymentOption(paymentOption: string) {
  if (paymentOption === "PIX") {
    return { billingType: "PIX" as const, installments: 1 }
  }

  // Belt-and-suspenders with the schema enum: parsing accepts only the
  // supported CC_1..CC_<MAX_INSTALLMENTS>. A hand-crafted POST that bypasses
  // the schema should fail hard, not quietly accept CC_0 or out-of-range.
  const match = paymentOption.match(/^CC_(\d+)$/)
  const installments = match ? Number(match[1]) : NaN
  if (
    !match ||
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > MAX_INSTALLMENTS
  ) {
    throw new Error(`Invalid payment option: ${paymentOption}`)
  }

  return {
    billingType: "CREDIT_CARD" as const,
    installments,
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

  try {
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
  } catch (dbError) {
    // Asaas customer + charge were created but our DB doesn't know about
    // them. Cancel the charge so we don't leave an orphaned Asaas payment
    // that the participant could pay with no local record.
    logger.error("DB update failed after Asaas charge creation — cancelling orphaned charge", {
      paymentRequestId: paymentRequest.id,
      asaasPaymentId: payment.id,
      error: dbError instanceof Error ? dbError.message : String(dbError),
    })
    try {
      await cancelAsaasPayment(payment.id)
    } catch (cancelError) {
      logger.error("MANUAL RECONCILIATION REQUIRED: failed to cancel orphaned Asaas charge", {
        paymentRequestId: paymentRequest.id,
        asaasPaymentId: payment.id,
        cancelError: cancelError instanceof Error ? cancelError.message : String(cancelError),
      })
    }
    throw dbError
  }

  return { invoiceUrl: payment.invoiceUrl }
}

export async function markPaymentAsExpired(paymentRequestId: string) {
  const result = await kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "expired" as const,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", paymentRequestId)
    .where("status", "in", ["pending", "awaiting_payment"])
    .returningAll()
    .executeTakeFirst()

  if (!result) {
    logger.info("markPaymentAsExpired: row is no longer in a non-terminal state", {
      paymentRequestId,
    })
  }

  return result
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

  // Need the current amount to set refund_amount — do a SELECT first so we
  // don't lose audit information. The WHERE on the UPDATE still provides
  // atomicity (only flips rows where status is still 'paid').
  const current = await kyselyDb
    .selectFrom("payment_requests")
    .selectAll()
    .where("event_participant_id", "=", eventParticipantId)
    .where("payment_mode", "=", "manual")
    .where("status", "=", "paid")
    .executeTakeFirst()

  if (!current) {
    throw new Error("No paid manual payment request found for this participant")
  }

  const result = await kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "refunded",
      refund_amount: current.amount,
      refunded_at: now,
      updated_at: now,
    })
    .where("id", "=", current.id)
    .where("status", "=", "paid")
    .returningAll()
    .executeTakeFirst()

  if (!result) {
    // Row flipped to another status between SELECT and UPDATE (concurrent admin).
    throw new Error("Manual payment was concurrently modified; refund aborted")
  }

  try {
    const participantInfo = await kyselyDb
      .selectFrom("event_participants")
      .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
      .innerJoin("events", "events.id", "event_participants.event_id")
      .select(["profiles.email", "profiles.full_name", "events.title"])
      .where("event_participants.id", "=", eventParticipantId)
      .executeTakeFirst()

    if (participantInfo?.email) {
      await sendPaymentRefundEmail({
        participantEmail: participantInfo.email,
        participantName: participantInfo.full_name ?? "Participante",
        eventName: participantInfo.title ?? "Evento Positiv",
        refundAmount: Number(result.amount),
      })
    }
  } catch (emailError) {
    logger.error("Failed to send manual refund notification email (non-fatal)", {
      eventParticipantId,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    })
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

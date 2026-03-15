import type { ActionFunctionArgs } from "react-router"
import { composable } from "composable-functions"
import { env } from "~/env.server"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"

type WebhookAction = "marked_paid" | "marked_expired" | "unhandled_event"
type WebhookSkipReason = "already_paid"

export type AsaasWebhookSuccessResponse = {
  received: true
  action?: WebhookAction
  skipped?: WebhookSkipReason
  event?: string
}

export type AsaasWebhookErrorResponse = {
  error: string
  paymentId?: string
  paymentRequestId?: string
}

export type AsaasWebhookResponse = AsaasWebhookSuccessResponse | AsaasWebhookErrorResponse

function ok(data: AsaasWebhookSuccessResponse) {
  return Response.json(data satisfies AsaasWebhookResponse)
}

function fail(data: AsaasWebhookErrorResponse, status: number) {
  return Response.json(data satisfies AsaasWebhookResponse, { status })
}

const PAYMENT_EVENTS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"] as const

function isTokenValid(request: Request): boolean {
  const { asaasWebhookToken } = env()
  if (!asaasWebhookToken) return true
  return request.headers.get("asaas-access-token") === asaasWebhookToken
}

const findPaymentRequest = composable((asaasPaymentId: string) =>
  kyselyDb
    .selectFrom("payment_requests")
    .selectAll()
    .where("asaas_payment_id", "=", asaasPaymentId)
    .executeTakeFirst(),
)

const markAsPaid = composable(
  async (paymentRequestId: string, eventParticipantId: string, amount: number) => {
    await Promise.all([
      kyselyDb
        .updateTable("payment_requests")
        .set({
          status: "paid" as const,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", paymentRequestId)
        .execute(),
      kyselyDb
        .updateTable("event_participants")
        .set({ has_paid: true, payment: amount })
        .where("id", "=", eventParticipantId)
        .execute(),
    ])
  },
)

const markAsExpired = composable((paymentRequestId: string) =>
  kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "expired" as const,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", paymentRequestId)
    .execute(),
)

export async function action({ request }: ActionFunctionArgs) {
  if (!env().paymentSystemOnline) {
    return fail({ error: "Payment system offline" }, 404)
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    logger.warn("Asaas webhook received with empty or unparseable body")
    return fail({ error: "Missing or invalid JSON body" }, 400)
  }

  if (!isTokenValid(request)) {
    logger.warn("Asaas webhook received with invalid token", { event: body.event })
    return fail({ error: "Invalid webhook token" }, 401)
  }

  const event = body.event as string
  const paymentId = body.payment?.id as string | undefined

  if (!paymentId) {
    logger.warn("Asaas webhook missing payment id", { event })
    return fail({ error: "Missing payment.id in webhook body" }, 400)
  }

  logger.info("Asaas webhook received", { event, paymentId, value: body.payment?.value })

  const findResult = await findPaymentRequest(paymentId)
  if (!findResult.success) {
    logger.error("Failed to query payment_requests table", { paymentId, errors: findResult.errors })
    return fail({ error: "Database error looking up payment request", paymentId }, 500)
  }

  const paymentRequest = findResult.data
  if (!paymentRequest) {
    logger.warn("Payment request not found for asaas_payment_id", { paymentId })
    return fail({ error: "No payment_request found", paymentId }, 200)
  }

  if (PAYMENT_EVENTS.includes(event as typeof PAYMENT_EVENTS[number])) {
    if (paymentRequest.status === "paid") {
      logger.info("Payment already paid, skipping", { paymentRequestId: paymentRequest.id })
      return ok({ received: true, skipped: "already_paid" })
    }

    const paidResult = await markAsPaid(
      paymentRequest.id,
      paymentRequest.event_participant_id,
      Number(paymentRequest.amount),
    )
    if (!paidResult.success) {
      logger.error("Failed to mark payment as paid", {
        paymentRequestId: paymentRequest.id,
        errors: paidResult.errors,
      })
      return fail(
        { error: "Database error updating payment to paid", paymentRequestId: paymentRequest.id },
        500,
      )
    }

    logger.info("Payment marked as paid", {
      paymentRequestId: paymentRequest.id,
      eventParticipantId: paymentRequest.event_participant_id,
    })
    return ok({ received: true, action: "marked_paid" })
  }

  if (event === "PAYMENT_OVERDUE") {
    const expiredResult = await markAsExpired(paymentRequest.id)
    if (!expiredResult.success) {
      logger.error("Failed to mark payment as expired", {
        paymentRequestId: paymentRequest.id,
        errors: expiredResult.errors,
      })
      return fail(
        { error: "Database error updating payment to expired", paymentRequestId: paymentRequest.id },
        500,
      )
    }

    logger.info("Payment marked as expired", { paymentRequestId: paymentRequest.id })
    return ok({ received: true, action: "marked_expired" })
  }

  logger.info("Unhandled Asaas webhook event", { event, paymentId })
  return ok({ received: true, action: "unhandled_event", event })
}

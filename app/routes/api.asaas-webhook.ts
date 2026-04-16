import { timingSafeEqual } from "node:crypto"
import type { ActionFunctionArgs } from "react-router"
import { composable } from "composable-functions"
import { env } from "~/env.server"
import { kyselyDb } from "~/kysely-db"
import { logger } from "~/lib/logger/logger.server"

type WebhookAction =
  | "marked_paid"
  | "marked_expired"
  | "marked_refunded"
  | "unhandled_event"
type WebhookSkipReason =
  | "already_paid"
  | "already_refunded"
  | "already_terminal"

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

export type AsaasWebhookResponse =
  | AsaasWebhookSuccessResponse
  | AsaasWebhookErrorResponse

function ok(data: AsaasWebhookSuccessResponse) {
  return Response.json(data satisfies AsaasWebhookResponse)
}

function fail(data: AsaasWebhookErrorResponse, status: number) {
  return Response.json(data satisfies AsaasWebhookResponse, { status })
}

const PAYMENT_EVENTS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"] as const
const REFUND_EVENTS = ["PAYMENT_REFUNDED", "PAYMENT_REFUND_IN_PROGRESS"] as const

let missingTokenWarned = false

type TokenCheckResult =
  | { ok: true }
  | { ok: false; reason: "not_configured_in_production" | "invalid_token" }

/**
 * Constant-time compare. The length-mismatch branch deliberately performs a
 * dummy compare against the SERVER-side token (`b`), not the attacker-controlled
 * input (`a`). Comparing against the attacker buffer would make the dummy
 * compare's runtime depend on the attacker's input length, leaking the
 * server-side token length via observable timing differences.
 *
 * `timingSafeEqual` is implemented as a native binding so V8 cannot DCE the
 * call; the discarded result is still observable side-effect-wise.
 */
function tokensEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) {
    // Dummy compare against the server token, NOT the attacker input.
    timingSafeEqual(bb, bb)
    return false
  }
  return timingSafeEqual(ba, bb)
}

function checkToken(request: Request): TokenCheckResult {
  const { asaasWebhookToken, nodeEnv } = env()
  if (!asaasWebhookToken) {
    if (nodeEnv === "production") {
      return { ok: false, reason: "not_configured_in_production" }
    }
    if (!missingTokenWarned) {
      logger.warn(
        "ASAAS_WEBHOOK_TOKEN not configured — webhook authentication disabled (dev/test only)",
      )
      missingTokenWarned = true
    }
    return { ok: true }
  }
  const header = request.headers.get("asaas-access-token")
  if (!header || !tokensEqual(header, asaasWebhookToken)) {
    return { ok: false, reason: "invalid_token" }
  }
  return { ok: true }
}

const findPaymentRequest = composable((asaasPaymentId: string) =>
  kyselyDb
    .selectFrom("payment_requests")
    .selectAll()
    .where("asaas_payment_id", "=", asaasPaymentId)
    .executeTakeFirst(),
)

// Only flip to paid if still in a non-terminal pre-paid state. Guards
// against out-of-order webhooks (e.g. a stale PAYMENT_RECEIVED arriving
// after a refund).
const markAsPaid = composable(async (paymentRequestId: string) => {
  const now = new Date().toISOString()
  return kyselyDb
    .updateTable("payment_requests")
    .set({ status: "paid" as const, paid_at: now, updated_at: now })
    .where("id", "=", paymentRequestId)
    .where("status", "in", ["pending", "awaiting_payment"])
    .returningAll()
    .executeTakeFirst()
})

// Only expire a row that hasn't already reached a terminal state. Without
// this guard, a late PAYMENT_OVERDUE can silently flip a paid row back
// to expired.
const markAsExpired = composable((paymentRequestId: string) =>
  kyselyDb
    .updateTable("payment_requests")
    .set({ status: "expired" as const, updated_at: new Date().toISOString() })
    .where("id", "=", paymentRequestId)
    .where("status", "in", ["pending", "awaiting_payment"])
    .returningAll()
    .executeTakeFirst(),
)

// Mark refunded based on external Asaas webhook. Only flips rows that are
// currently `paid`. Rows already in `partially_refunded` are intentionally
// excluded — overwriting `refund_amount` with the full amount would mask
// existing partial refund history, and we'd need the actual refund value
// from the webhook payload to handle partials correctly. We don't yet
// support partial refunds in the app, so this guard keeps us safe.
//
// Note: when partial refunds are added in the future, parse the actual refund
// value from `body.payment.value` (or whichever field Asaas exposes) and
// update `refund_amount` additively rather than overwriting.
const markAsRefunded = composable((paymentRequestId: string, amount: number) => {
  const now = new Date().toISOString()
  return kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "refunded" as const,
      refund_amount: amount,
      refunded_at: now,
      updated_at: now,
    })
    .where("id", "=", paymentRequestId)
    .where("status", "=", "paid")
    .returningAll()
    .executeTakeFirst()
})

export async function action({ request }: ActionFunctionArgs) {
  if (!env().paymentSystemOnline) {
    return fail({ error: "Payment system offline" }, 404)
  }

  const tokenCheck = checkToken(request)
  if (!tokenCheck.ok) {
    if (tokenCheck.reason === "not_configured_in_production") {
      logger.error(
        "ASAAS_WEBHOOK_TOKEN not configured in production — rejecting webhook",
      )
      return fail({ error: "Webhook token not configured" }, 503)
    }
    logger.warn("Asaas webhook received with invalid token")
    return fail({ error: "Invalid webhook token" }, 401)
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    logger.warn("Asaas webhook received with empty or unparseable body")
    return fail({ error: "Missing or invalid JSON body" }, 400)
  }

  const event = body.event as string
  const paymentId = body.payment?.id as string | undefined

  if (!paymentId) {
    logger.warn("Asaas webhook missing payment id", { event })
    return fail({ error: "Missing payment.id in webhook body" }, 400)
  }

  logger.info("Asaas webhook received", {
    event,
    paymentId,
    value: body.payment?.value,
  })

  const findResult = await findPaymentRequest(paymentId)
  if (!findResult.success) {
    logger.error("Failed to query payment_requests table", {
      paymentId,
      errors: findResult.errors,
    })
    return fail(
      { error: "Database error looking up payment request", paymentId },
      500,
    )
  }

  const paymentRequest = findResult.data
  if (!paymentRequest) {
    logger.warn("Payment request not found for asaas_payment_id", { paymentId })
    return fail({ error: "No payment_request found", paymentId }, 200)
  }

  if (PAYMENT_EVENTS.includes(event as (typeof PAYMENT_EVENTS)[number])) {
    if (paymentRequest.status === "paid") {
      logger.info("Payment already paid, skipping", {
        paymentRequestId: paymentRequest.id,
      })
      return ok({ received: true, skipped: "already_paid" })
    }

    const paidResult = await markAsPaid(paymentRequest.id)
    if (!paidResult.success) {
      logger.error("Failed to mark payment as paid", {
        paymentRequestId: paymentRequest.id,
        errors: paidResult.errors,
      })
      return fail(
        {
          error: "Database error updating payment to paid",
          paymentRequestId: paymentRequest.id,
        },
        500,
      )
    }

    if (!paidResult.data) {
      logger.info(
        "Skipped mark-as-paid: row is no longer in a pre-paid state",
        {
          paymentRequestId: paymentRequest.id,
          currentStatus: paymentRequest.status,
        },
      )
      return ok({ received: true, skipped: "already_terminal" })
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
        {
          error: "Database error updating payment to expired",
          paymentRequestId: paymentRequest.id,
        },
        500,
      )
    }

    if (!expiredResult.data) {
      logger.info(
        "Skipped mark-as-expired: row is no longer in a non-terminal state",
        {
          paymentRequestId: paymentRequest.id,
          currentStatus: paymentRequest.status,
        },
      )
      return ok({ received: true, skipped: "already_terminal" })
    }

    logger.info("Payment marked as expired", {
      paymentRequestId: paymentRequest.id,
    })
    return ok({ received: true, action: "marked_expired" })
  }

  if (REFUND_EVENTS.includes(event as (typeof REFUND_EVENTS)[number])) {
    if (paymentRequest.status === "refunded") {
      logger.info("Payment already refunded, skipping", {
        paymentRequestId: paymentRequest.id,
      })
      return ok({ received: true, skipped: "already_refunded" })
    }

    const amount = Number(paymentRequest.amount)
    const refundedResult = await markAsRefunded(paymentRequest.id, amount)
    if (!refundedResult.success) {
      logger.error("Failed to mark payment as refunded", {
        paymentRequestId: paymentRequest.id,
        errors: refundedResult.errors,
      })
      return fail(
        {
          error: "Database error updating payment to refunded",
          paymentRequestId: paymentRequest.id,
        },
        500,
      )
    }

    if (!refundedResult.data) {
      logger.warn(
        "Skipped mark-as-refunded: row is not in a refundable state",
        {
          paymentRequestId: paymentRequest.id,
          currentStatus: paymentRequest.status,
        },
      )
      return ok({ received: true, skipped: "already_terminal" })
    }

    logger.info("Payment marked as refunded", {
      paymentRequestId: paymentRequest.id,
      event,
    })
    return ok({ received: true, action: "marked_refunded" })
  }

  logger.info("Unhandled Asaas webhook event", { event, paymentId })
  return ok({ received: true, action: "unhandled_event", event })
}

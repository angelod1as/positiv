import { timingSafeEqual } from "node:crypto"
import { fromZonedTime } from "date-fns-tz"
import { ENV } from "varlock/env"
import type { z } from "zod"
import { zod } from "~/lib/helpers/zod"
import { logger } from "~/lib/logger/logger.server"
import type { PaymentEvent, WebhookReading } from "../../payment-provider"
import { reaisToCents } from "./asaas-client.server"
import { asaasRefunds } from "./asaas-refunds"

/**
 * Deliberately permissive. Asaas adds fields without warning, and the docs say
 * so: a body that carries something new must still be processed, not rejected.
 * Only `id` and `event` are required, because they are what dedupes and routes.
 */
export const webhookEventSchema = zod.looseObject({
  id: zod.string().min(1),
  event: zod.string().min(1),
  dateCreated: zod.string().optional(),
  payment: zod
    .looseObject({
      id: zod.string(),
      status: zod.string().optional(),
      value: zod.number().optional(),
      installment: zod.string().nullable().optional(),
      externalReference: zod.string().nullable().optional(),
      paymentDate: zod.string().nullable().optional(),
      confirmedDate: zod.string().nullable().optional(),
      dueDate: zod.string().nullable().optional(),
      refunds: zod
        .array(
          zod.looseObject({
            value: zod.number().optional(),
            status: zod.string().optional(),
          }),
        )
        .nullable()
        .optional(),
    })
    .optional(),
  // Not in the documented payload, but sent: PAYMENT_REFUND_DENIED carries the
  // reason here.
  additionalInfo: zod
    .looseObject({ denialReason: zod.string().nullable().optional() })
    .nullable()
    .optional(),
})

export type AsaasWebhookEvent = z.infer<typeof webhookEventSchema>

function tokensMatch(sent: string | null, expected: string): boolean {
  // A length mismatch would make timingSafeEqual throw, and returning early on
  // it leaks the length — so compare against a buffer of the right size either
  // way and let the result be false.
  const sentBuffer = Buffer.from(sent ?? "")
  const expectedBuffer = Buffer.from(expected)
  if (sentBuffer.length !== expectedBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer)
    return false
  }
  return timingSafeEqual(sentBuffer, expectedBuffer)
}

const PAID_EVENTS = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]
const ALARM_EVENTS = [
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
]
const PLAIN_EVENTS: Record<
  string,
  "overdue" | "cancelled" | "restored" | "refund_in_progress"
> = {
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_DELETED: "cancelled",
  PAYMENT_RESTORED: "restored",
  PAYMENT_REFUND_IN_PROGRESS: "refund_in_progress",
}

// Asaas dates a charge by the calendar day in Brazil and it stays payable
// through the end of that day, which is what `due_at` has to mean: the expiry
// cron and the overdue event both read it.
const CHARGE_TIME_ZONE = "America/Sao_Paulo"
const ASAAS_DATE = /^\d{4}-\d{2}-\d{2}$/

function dueAtFromAsaas(dueDate: string | null | undefined): string | null {
  if (!dueDate || !ASAAS_DATE.test(dueDate)) return null
  return fromZonedTime(`${dueDate}T23:59:59`, CHARGE_TIME_ZONE).toISOString()
}

const cents = (reais: number | undefined) =>
  reais == null ? null : reaisToCents(reais)

/** What an Asaas delivery means for a payment, in our terms. */
export function translateAsaasEvent(event: AsaasWebhookEvent): PaymentEvent {
  const payment = event.payment
  const base = {
    eventId: event.id,
    providerType: event.event,
    chargeId: payment?.id ?? null,
    planId: payment?.installment ?? null,
    reference: payment?.externalReference ?? null,
  }

  if (!payment) return { ...base, type: "ignored" }

  if (PAID_EVENTS.includes(event.event)) {
    return { ...base, type: "paid", amount: cents(payment.value) }
  }

  if (ALARM_EVENTS.includes(event.event)) return { ...base, type: "alarm" }

  if (event.event === "PAYMENT_REFUND_DENIED") {
    return {
      ...base,
      type: "refund_denied",
      reason: event.additionalInfo?.denialReason ?? null,
    }
  }

  const plain = PLAIN_EVENTS[event.event]
  if (plain) return { ...base, type: plain }

  if (event.event === "PAYMENT_UPDATED") {
    return {
      ...base,
      type: "updated",
      amount: cents(payment.value),
      dueAt: dueAtFromAsaas(payment.dueDate),
    }
  }

  if (
    event.event === "PAYMENT_REFUNDED" ||
    event.event === "PAYMENT_PARTIALLY_REFUNDED"
  ) {
    // A PAYMENT_REFUNDED that lists nothing gave the charge back whole. A
    // partial one without a list says nothing about how much moved, and
    // reading it as the whole amount would close the row as fully refunded.
    const listed = payment.refunds?.length
      ? asaasRefunds(payment.refunds)
      : null
    const whole =
      event.event === "PAYMENT_REFUNDED" && payment.value != null
        ? asaasRefunds([{ value: payment.value, status: "DONE" }])
        : null

    return {
      ...base,
      type:
        event.event === "PAYMENT_REFUNDED" ? "refunded" : "partially_refunded",
      refunds: listed ?? whole,
    }
  }

  return { ...base, type: "ignored" }
}

export async function readAsaasWebhook(
  request: Request,
): Promise<WebhookReading> {
  const expected = ENV.ASAAS_WEBHOOK_TOKEN
  if (!expected) {
    // Never accept an unauthenticated webhook. A deploy without the token is a
    // misconfiguration to fix, not a door to leave open.
    logger.error(
      "ASAAS_WEBHOOK_TOKEN is not configured; refusing every webhook",
    )
    return { ok: false, status: 503, error: "not_configured" }
  }

  if (!tokensMatch(request.headers.get("asaas-access-token"), expected)) {
    return { ok: false, status: 401, error: "unauthorized" }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { ok: false, status: 400, error: "invalid_json" }
  }

  const parsed = webhookEventSchema.safeParse(body)
  if (!parsed.success) {
    logger.warn("Asaas webhook body did not parse", {
      issues: parsed.error.issues,
    })
    return { ok: false, status: 400, error: "invalid_body" }
  }

  return { ok: true, event: translateAsaasEvent(parsed.data), payload: body }
}

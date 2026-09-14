import { timingSafeEqual } from "node:crypto"
import type { ActionFunctionArgs } from "react-router"
import { ENV } from "varlock/env"
import {
  applyWebhookEvent,
  recordWebhookEvent,
  webhookEventSchema,
} from "~/business/payment/payment-webhook.server"
import { logger } from "~/lib/logger/logger.server"

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

export async function action({ request }: ActionFunctionArgs) {
  if (!ENV.PAYMENTS_ENABLED) {
    return new Response(null, { status: 404 })
  }

  const expected = ENV.ASAAS_WEBHOOK_TOKEN
  if (!expected) {
    // Never accept an unauthenticated webhook. A deploy without the token is a
    // misconfiguration to fix, not a door to leave open.
    logger.error("ASAAS_WEBHOOK_TOKEN is not configured; refusing every webhook")
    return Response.json({ error: "not_configured" }, { status: 503 })
  }

  if (!tokensMatch(request.headers.get("asaas-access-token"), expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = webhookEventSchema.safeParse(body)
  if (!parsed.success) {
    logger.warn("Asaas webhook body did not parse", {
      issues: parsed.error.issues,
    })
    return Response.json({ error: "invalid_body" }, { status: 400 })
  }

  const event = parsed.data

  try {
    const recorded = await recordWebhookEvent(event)
    // Only an event that was seen through to the end is a duplicate. One that
    // failed mid-flight is in the inbox too, and this retry is its second
    // chance -- answering "deduped" would drop the payment for good.
    if (recorded.alreadyProcessed) {
      return Response.json({ ok: true, deduped: true })
    }

    const result = await applyWebhookEvent(recorded.id, event)
    return Response.json({ ok: true, ...result })
  } catch (error) {
    logger.error("Asaas webhook could not be processed", {
      asaasEventId: event.id,
      event: event.event,
      asaasPaymentId: event.payment?.id,
      error: error instanceof Error ? error.message : String(error),
    })
    // 500 so Asaas retries. Its queue is sequential, so a failure here holds
    // the rest back — which is what we want: the next event about this payment
    // must not overtake the one that failed.
    return Response.json({ error: "processing_failed" }, { status: 500 })
  }
}

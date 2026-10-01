import type { ActionFunctionArgs } from "react-router"
import { paymentProvider } from "~/business/payment/payment-provider.server"
import {
  applyWebhookEvent,
  recordWebhookEvent,
} from "~/business/payment/payment-webhook.server"
import { logger } from "~/lib/logger/logger.server"

/**
 * Where the payment provider delivers its events. The connector checks the
 * delivery is really the provider's and translates it into our own event; the
 * inbox and the transitions never see the provider's shape.
 */
export async function action({ request }: ActionFunctionArgs) {
  const reading = await paymentProvider().readWebhook(request)
  if (!reading.ok) {
    return Response.json({ error: reading.error }, { status: reading.status })
  }

  const { event, payload } = reading

  try {
    const recorded = await recordWebhookEvent(event, payload)
    // Only an event that was seen through to the end is a duplicate. One that
    // failed mid-flight is in the inbox too, and this retry is its second
    // chance -- answering "deduped" would drop the payment for good.
    if (recorded.alreadyProcessed) {
      return Response.json({ ok: true, deduped: true })
    }

    const result = await applyWebhookEvent(recorded.id, event)
    return Response.json({ ok: true, ...result })
  } catch (error) {
    logger.error("Payment webhook could not be processed", {
      providerEventId: event.eventId,
      event: event.providerType,
      chargeId: event.chargeId,
      error: error instanceof Error ? error.message : String(error),
    })
    // 500 so the provider retries. A sequential queue holds the rest back on a
    // failure — which is what we want: the next event about this payment must
    // not overtake the one that failed.
    return Response.json({ error: "processing_failed" }, { status: 500 })
  }
}

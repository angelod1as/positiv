import type { ActionFunctionArgs } from "react-router"
import { handleWebhookPayment } from "~/business/admin/handle-webhook-payment.server"
import { verifyWebhookSignature } from "~/integrations/asaas/client.server"
import { HANDLED_WEBHOOK_EVENTS } from "~/integrations/asaas/constants"
import type { AsaasWebhookEvent, AsaasWebhookPayload } from "~/integrations/asaas/types"
import { isPaymentSystemEnabled } from "~/lib/features.server"
import { logger } from "~/lib/logger/logger.server"

export async function action({ request }: ActionFunctionArgs) {
  if (!isPaymentSystemEnabled()) {
    return Response.json({ ignored: true }, { status: 200 })
  }

  const token = request.headers.get("asaas-access-token") ?? ""
  if (!verifyWebhookSignature(token)) {
    return Response.json({ ignored: true }, { status: 200 })
  }

  try {
    const payload = (await request.json()) as AsaasWebhookPayload

    if (!HANDLED_WEBHOOK_EVENTS.includes(payload.event as AsaasWebhookEvent)) {
      return Response.json({ ignored: true }, { status: 200 })
    }

    await handleWebhookPayment(payload)
    return Response.json({ ok: true }, { status: 200 })
  } catch (error) {
    logger.error("Webhook handler error:", { error })
    return Response.json({ ok: true }, { status: 200 })
  }
}

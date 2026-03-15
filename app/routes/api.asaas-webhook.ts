import type { ActionFunctionArgs } from "react-router"
import { env } from "~/env.server"
import { logger } from "~/lib/logger/logger.server"

export async function action({ request }: ActionFunctionArgs) {
  if (!env().paymentSystemOnline) {
    return Response.json({ error: "Payment system offline" }, { status: 404 })
  }

  try {
    const body = await request.json()

    logger.info("Asaas webhook received", {
      event: body.event,
      paymentId: body.payment?.id,
      status: body.payment?.status,
      billingType: body.payment?.billingType,
      value: body.payment?.value,
    })
  } catch (error) {
    logger.error("Error processing Asaas webhook", { error })
  }

  return Response.json({ received: true })
}

import { timingSafeEqual } from "node:crypto"
import type { ActionFunctionArgs } from "react-router"
import { ENV } from "varlock/env"
import { sweepPaymentEmails } from "~/business/payment/payment-email-outbox.server"
import { logger } from "~/lib/logger/logger.server"

/**
 * Sends the payment emails nobody managed to send.
 *
 * Called by the pg_cron job 'retry-payment-emails'. Authentication is the same
 * bearer token every internal job uses.
 */
export async function action({ request }: ActionFunctionArgs) {
  const authHeader = request.headers.get("Authorization")
  const secret = ENV.INTERNAL_JOB_SECRET

  if (!secret) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const providedToken = Buffer.from(authHeader || "")
  const expectedToken = Buffer.from(`Bearer ${secret}`)

  if (
    providedToken.length !== expectedToken.length ||
    !timingSafeEqual(providedToken, expectedToken)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const stats = await sweepPaymentEmails()

    return Response.json({ success: true, stats })
  } catch (error) {
    logger.error("The payment email sweep failed", { error })

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

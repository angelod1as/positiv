import { timingSafeEqual } from "node:crypto"
import type { ActionFunctionArgs } from "react-router"
import { ENV } from "varlock/env"
import { syncOpenPayments } from "~/business/payment/payment-sync.server"
import { logger } from "~/lib/logger/logger.server"

/**
 * Reads from Asaas the payments it may still have news about -- refunds on
 * their way, anticipations not yet credited -- so the admin sees them without
 * waiting for, or losing, a webhook.
 *
 * Called by the pg_cron job 'sync-payment-refunds'. Authentication is the same
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
    const stats = await syncOpenPayments()

    return Response.json({ success: true, stats })
  } catch (error) {
    logger.error("The payment refund sync failed", { error })

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

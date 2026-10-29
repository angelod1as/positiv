import { timingSafeEqual } from "node:crypto"
import type { ActionFunctionArgs } from "react-router"
import { ENV } from "varlock/env"
import { syncListmonkUnsubscribes } from "~/business/newsletter/listmonk-unsubscribe-sync.server"
import { logger } from "~/lib/logger/logger.server"

/**
 * Pulls unsubscribes made in Listmonk back into newsletter consent on the
 * site — Listmonk has no outgoing webhooks to push them.
 *
 * Called by the pg_cron job 'sync-listmonk-unsubscribes'. Authentication is
 * the same bearer token every internal job uses.
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

  const result = await syncListmonkUnsubscribes()

  if (!result.success) {
    logger.error("The Listmonk unsubscribe sync failed", {
      errors: result.errors.map((error) => error.message),
    })

    return Response.json(
      {
        success: false,
        error: result.errors[0]?.message ?? "Unknown error",
      },
      { status: 500 },
    )
  }

  return Response.json({ success: true, stats: result.data })
}

import { timingSafeEqual } from "node:crypto"
import type { ActionFunctionArgs } from "react-router"
import { ENV } from "varlock/env"
import { syncRegistrationAlertsListmonkList } from "~/business/newsletter/registration-alerts-list.server"
import { logger } from "~/lib/logger/logger.server"

/**
 * Brings the Registration alerts Listmonk list in line with the profiles that
 * have Registration alerts on (WEB-52).
 *
 * Called every 30 minutes by the pg_cron job 'sync-registration-alerts-list'.
 * Authentication is the same bearer token every internal job uses.
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

  const result = await syncRegistrationAlertsListmonkList()

  if (!result.success) {
    logger.error("The Registration alerts Listmonk list sync failed", {
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

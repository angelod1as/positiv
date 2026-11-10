import { timingSafeEqual } from "node:crypto"
import type { ActionFunctionArgs } from "react-router"
import { ENV } from "varlock/env"
import { syncVeteransListmonkList } from "~/business/newsletter/veterans-list.server"
import { logger } from "~/lib/logger/logger.server"

/**
 * Brings the Veterans Listmonk list in line with the consenting veterans on
 * the site — the safety net behind the syncs that run when an event completes
 * or an admin changes someone's veteran flag.
 *
 * Called once a day by the pg_cron job 'sync-veterans-list'. Authentication is
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

  const result = await syncVeteransListmonkList()

  if (!result.success) {
    logger.error("The Veterans Listmonk list sync failed", {
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

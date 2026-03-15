import type { ActionFunctionArgs } from "react-router"
import { processFailedSyncRetries } from "~/business/newsletter/retry-failed-syncs.server"
import { logger } from "~/lib/logger/logger.server"
import { timingSafeEqual } from "node:crypto"

/**
 * Internal API endpoint for retrying failed newsletter syncs
 * Called by pg_cron job 'retry-failed-newsletter-syncs'
 *
 * Authentication: Requires Bearer token matching INTERNAL_JOB_SECRET
 * Method: POST only
 * Schedule: Every 30 minutes
 *
 * @returns JSON response with one of these shapes:
 *  - Success: `{ success: true, stats: { processed, succeeded, failed, skipped } }`
 *  - Error: `{ success: false, error: string, details?: unknown[], stats: { ... } }`
 */
export async function action({ request }: ActionFunctionArgs) {
  // Verify request is from authorized internal source using secret token
  const authHeader = request.headers.get("Authorization")
  const secret = process.env.INTERNAL_JOB_SECRET

  if (!secret) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const expectedToken = `Bearer ${secret}`

  // Use timing-safe comparison to prevent timing attacks
  const providedTokenBuffer = Buffer.from(authHeader || "")
  const expectedTokenBuffer = Buffer.from(expectedToken)

  if (
    providedTokenBuffer.length !== expectedTokenBuffer.length ||
    !timingSafeEqual(providedTokenBuffer, expectedTokenBuffer)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only allow POST method
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    // Process failed newsletter syncs with retry logic
    const result = await processFailedSyncRetries()

    if (!result.success || !result.data) {
      logger.error("Failed to process newsletter sync retries", { errors: result.errors })
      return Response.json(
        {
          success: false,
          error: "Failed to process retries",
          details: result.errors,
          stats: {
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
          },
        },
        { status: 500 },
      )
    }

    return Response.json({
      success: true,
      stats: result.data,
    })
  } catch (error) {
    logger.error("Error processing newsletter sync retries:", { error })

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stats: {
          processed: 0,
          succeeded: 0,
          failed: 0,
          skipped: 0,
        },
      },
      { status: 500 },
    )
  }
}

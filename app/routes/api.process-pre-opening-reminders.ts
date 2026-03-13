import type { ActionFunctionArgs } from "react-router"
import { processCampaignForEvent } from "~/business/newsletter/campaign-automation.server"
import { getPendingCampaigns } from "~/business/newsletter/campaign-tracking.server"
import { logger } from "~/lib/logger/logger.server"

/**
 * Internal API endpoint for processing pre-opening reminder campaigns
 * Called by Supabase Edge Function via pg_cron
 */
export async function action({ request }: ActionFunctionArgs) {
  // Verify request is from authorized internal source using secret token
  const authHeader = request.headers.get("Authorization")
  const secret = process.env.INTERNAL_JOB_SECRET

  if (!secret) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const expectedToken = `Bearer ${secret}`

  if (!authHeader || authHeader !== expectedToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all pending pre-opening campaigns
    const pendingResult = await getPendingCampaigns("pre_opening")

    if (!pendingResult.success || !pendingResult.data) {
      return Response.json(
        {
          success: false,
          error: "Failed to fetch pending pre-opening campaigns",
          processed: 0,
          errors: [],
        },
        { status: 500 },
      )
    }

    const pending = pendingResult.data
    const results: Array<{
      eventId: string
      success: boolean
      error?: string
    }> = []

    // Process each campaign
    for (const campaign of pending) {
      const result = await processCampaignForEvent(
        campaign.event_id,
        "pre_opening",
      )

      results.push({
        eventId: campaign.event_id,
        success: result.success,
        error: result.success
          ? undefined
          : result.errors?.[0]?.message || "Unknown error",
      })
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return Response.json({
      success: true,
      processed: pending.length,
      succeeded: successCount,
      failed: failureCount,
      results,
    })
  } catch (error) {
    logger.error("Error processing pre-opening campaigns:", error)

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processed: 0,
        errors: [],
      },
      { status: 500 },
    )
  }
}

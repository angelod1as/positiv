import type { ActionFunctionArgs } from "react-router"
import { deleteEventListmonkList } from "~/business/admin/event-listmonk-sync.server"
import { getPendingCampaigns } from "~/business/newsletter/campaign-tracking.server"
import { processCampaignForEvent } from "~/business/newsletter/campaign-automation.server"
import { kysely } from "~/kysely"

/**
 * Internal API endpoint for processing newsletter campaigns
 * Called by Supabase Edge Function via pg_cron
 */
export async function action({ request }: ActionFunctionArgs) {
  // Verify request is from authorized internal source using secret token
  const authHeader = request.headers.get("Authorization")
  const expectedToken = `Bearer ${process.env.INTERNAL_JOB_SECRET}`

  if (!authHeader || authHeader !== expectedToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all pending campaigns
    const pendingResult = await getPendingCampaigns()

    if (!pendingResult.success || !pendingResult.data) {
      return Response.json(
        {
          success: false,
          error: "Failed to fetch pending campaigns",
          processed: 0,
          errors: [],
        },
        { status: 500 },
      )
    }

    const pending = pendingResult.data
    const results: Array<{ eventId: string; success: boolean; error?: string }> =
      []

    // Process each campaign
    for (const campaign of pending) {
      const result = await processCampaignForEvent(campaign.event_id)

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

    // Cleanup lists for completed events where time_group_end has passed
    const cleanupResults = await cleanupCompletedEventLists()

    return Response.json({
      success: true,
      processed: pending.length,
      succeeded: successCount,
      failed: failureCount,
      results,
      listCleanup: cleanupResults,
    })
  } catch (error) {
    console.error("Error processing campaigns:", error)

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

async function cleanupCompletedEventLists() {
  const eventsToCleanup = await kysely
    .selectFrom("events")
    .select(["id", "listmonk_list_id"])
    .where("event_status", "=", "Completed")
    .where("time_group_end", "<", new Date().toISOString())
    .where("listmonk_list_id", "is not", null)
    .execute()

  const results: Array<{ eventId: string; success: boolean; error?: string }> =
    []

  for (const event of eventsToCleanup) {
    const result = await deleteEventListmonkList(event.id)
    results.push({
      eventId: event.id,
      success: result.success,
      error: result.success
        ? undefined
        : result.errors?.[0]?.message || "Unknown error",
    })
  }

  return {
    cleaned: eventsToCleanup.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  }
}

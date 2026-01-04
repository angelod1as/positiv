import type { ActionFunctionArgs } from "react-router"
import { deleteEventListmonkList } from "~/business/admin/event-listmonk-sync.server"
import { getPendingCampaigns } from "~/business/newsletter/campaign-tracking.server"
import { processCampaignForEvent } from "~/business/newsletter/campaign-automation.server"
import { getPendingGroupClosingEmails } from "~/business/email/group-closing-tracking.server"
import { sendGroupClosingEmailsForEvent } from "~/business/email/send-group-closing-emails.server"
import { kysely } from "~/kysely"

/**
 * Internal API endpoint for processing automated emails
 * - Newsletter campaigns (via Listmonk)
 * - Group closing transactional emails (via Nodemailer)
 * Called by Supabase pg_cron every 30 minutes
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

    // Process group closing emails
    const groupClosingResult = await getPendingGroupClosingEmails()
    const groupClosingResults: Array<{
      eventId: string
      success: boolean
      error?: string
      recipientCount?: number
    }> = []

    if (groupClosingResult.success && groupClosingResult.data) {
      const pendingGroupClosing = groupClosingResult.data

      for (const tracking of pendingGroupClosing) {
        const result = await sendGroupClosingEmailsForEvent(tracking.event_id)

        groupClosingResults.push({
          eventId: tracking.event_id,
          success: result.success,
          recipientCount: result.success ? result.data : undefined,
          error: result.success
            ? undefined
            : result.errors?.[0]?.message || "Unknown error",
        })
      }
    }

    const groupClosingSuccessCount = groupClosingResults.filter(
      (r) => r.success,
    ).length
    const groupClosingFailureCount = groupClosingResults.filter(
      (r) => !r.success,
    ).length

    // Cleanup lists for completed events where time_group_end has passed
    const cleanupResults = await cleanupCompletedEventLists()

    return Response.json({
      success: true,
      campaigns: {
        processed: pending.length,
        succeeded: successCount,
        failed: failureCount,
        results,
      },
      groupClosingEmails: {
        processed: groupClosingResults.length,
        succeeded: groupClosingSuccessCount,
        failed: groupClosingFailureCount,
        results: groupClosingResults,
      },
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

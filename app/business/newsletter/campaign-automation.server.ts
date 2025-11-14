import { composable, sequence } from "composable-functions"
import { kysely } from "~/kysely"
import { env } from "~/env.server"
import { LISTMONK_ALL_SUBSCRIBERS_LIST_ID } from "~/lib/constants/constants"
import { createEventOpeningCampaign } from "./create-event-opening-campaign.server"
import {
  updateCampaignCreated,
  updateCampaignSent,
  updateCampaignError,
} from "./campaign-tracking.server"

type CampaignErrorStep = "campaign_creation" | "send_signal"

function getListmonkConfig() {
  const { listmonkApiUrl, listmonkApiUsername, listmonkApiPassword } = env()

  if (!listmonkApiUrl || !listmonkApiUsername || !listmonkApiPassword) {
    throw new Error("Listmonk API credentials not configured")
  }

  const basicAuthHeader = `Basic ${Buffer.from(
    `${listmonkApiUsername}:${listmonkApiPassword}`,
  ).toString("base64")}`

  const headers = {
    Authorization: basicAuthHeader,
    "Content-Type": "application/json",
  }

  return { listmonkApiUrl, headers }
}

/**
 * Creates a campaign in Listmonk for the given event
 * Returns the campaign ID on success
 */
export const createCampaignForEvent = composable(
  async (eventId: string): Promise<number> => {
    // Fetch event data
    const event = await kysely
      .selectFrom("events")
      .selectAll()
      .where("id", "=", eventId)
      .executeTakeFirst()

    if (!event) {
      throw new Error(`Event not found: ${eventId}`)
    }

    // Create campaign using existing function
    const campaignResult = await createEventOpeningCampaign({
      event,
      listIds: [LISTMONK_ALL_SUBSCRIBERS_LIST_ID],
      sendImmediately: false,
    })

    // Handle campaign creation errors
    if (!campaignResult.success || !campaignResult.data) {
      const errorMessage =
        campaignResult.errors?.[0]?.message ||
        "Unknown error creating campaign"

      // Update tracking with error
      await updateCampaignError(eventId, {
        step: "campaign_creation",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      })

      throw new Error(errorMessage)
    }

    const campaignId = campaignResult.data.data.id

    // Update tracking row with success
    await updateCampaignCreated(eventId, String(campaignId))

    return campaignId
  },
)

/**
 * Sends an already-created campaign
 */
export const sendCampaign = composable(async (eventId: string): Promise<void> => {
  // Fetch tracking row to get campaign ID
  const tracking = await kysely
    .selectFrom("event_newsletter_campaigns")
    .selectAll()
    .where("event_id", "=", eventId)
    .executeTakeFirst()

  if (!tracking) {
    throw new Error(`Tracking row not found for event: ${eventId}`)
  }

  if (!tracking.campaign_id) {
    throw new Error(
      `Campaign not created yet for event: ${eventId}. Cannot send.`,
    )
  }

  const { listmonkApiUrl, headers } = getListmonkConfig()

  // Send campaign by updating status to "running"
  const response = await fetch(
    `${listmonkApiUrl}/api/campaigns/${tracking.campaign_id}/status`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ status: "running" }),
    },
  )

  if (!response.ok) {
    const errorBody = await response
      .text()
      .catch(() => "Unable to read error body")

    const errorMessage = `Failed to send campaign: ${response.status} ${response.statusText}. Response: ${errorBody}`

    // Update tracking with error
    await updateCampaignError(eventId, {
      step: "send_signal",
      message: errorMessage,
      timestamp: new Date().toISOString(),
    })

    throw new Error(errorMessage)
  }

  // Update tracking row with success
  await updateCampaignSent(eventId)
})

/**
 * Main orchestrator that processes a campaign for an event
 * - If campaign not created: creates it, then sends it
 * - If campaign created but not sent: sends it
 * - If already sent: does nothing
 */
export const processCampaignForEvent = composable(
  async (eventId: string): Promise<void> => {
    // Get current tracking state
    const tracking = await kysely
      .selectFrom("event_newsletter_campaigns")
      .selectAll()
      .where("event_id", "=", eventId)
      .executeTakeFirst()

    if (!tracking) {
      throw new Error(`No tracking row found for event: ${eventId}`)
    }

    // If already sent, nothing to do
    if (tracking.campaign_is_sent) {
      return
    }

    // If not created yet, create it first
    if (!tracking.campaign_is_created) {
      const createResult = await createCampaignForEvent(eventId)

      // Check if creation failed - if so, stop here
      if (!createResult.success) {
        throw new Error(
          createResult.errors?.[0]?.message || "Failed to create campaign"
        )
      }
    }

    // Then send it
    const sendResult = await sendCampaign(eventId)

    // Check if sending failed
    if (!sendResult.success) {
      throw new Error(
        sendResult.errors?.[0]?.message || "Failed to send campaign"
      )
    }
  },
)

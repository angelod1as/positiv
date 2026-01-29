import { composable } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import { json } from "~/lib/helpers/kysely-helpers"

type CampaignErrorData = {
  step: "campaign_creation" | "send_signal"
  message: string
  timestamp: string
}

export const createCampaignTracking = composable(
  async (
    eventId: string,
    campaignType: "opening" | "pre_opening" = "opening",
    shouldSendAt?: string,
  ) => {
    await kyselyDb
      .insertInto("event_newsletter_campaigns")
      .values({
        event_id: eventId,
        campaign_type: campaignType,
        should_send_at: shouldSendAt,
        campaign_is_created: false,
        campaign_is_sent: false,
        times_attempted: 0,
      })
      .onConflict((oc) => oc.columns(["event_id", "campaign_type"]).doNothing())
      .execute()

    return true
  },
)

export const getPendingCampaigns = composable(
  async (campaignType: "opening" | "pre_opening") => {
    const campaigns = await kyselyDb
      .selectFrom("event_newsletter_campaigns")
      .selectAll()
      .where("campaign_type", "=", campaignType)
      .where("times_attempted", "<", 3)
      .where((eb) =>
        eb.or([
          eb("campaign_is_created", "=", false),
          eb("campaign_is_sent", "=", false),
        ]),
      )
      .where((eb) =>
        eb.or([
          eb("should_send_at", "<=", new Date().toISOString()),
          eb("should_send_at", "is", null),
        ]),
      )
      .execute()

    return campaigns
  },
)

export const updateCampaignCreated = composable(
  async (
    eventId: string,
    campaignId: string,
    campaignType: "opening" | "pre_opening",
  ) => {
    await kyselyDb
      .updateTable("event_newsletter_campaigns")
      .set({
        campaign_is_created: true,
        campaign_creation_time: new Date().toISOString(),
        campaign_id: campaignId,
        updated_at: new Date().toISOString(),
      })
      .where("event_id", "=", eventId)
      .where("campaign_type", "=", campaignType)
      .execute()

    return true
  },
)

export const updateCampaignSent = composable(
  async (eventId: string, campaignType: "opening" | "pre_opening") => {
    await kyselyDb
      .updateTable("event_newsletter_campaigns")
      .set({
        campaign_is_sent: true,
        campaign_sent_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where("event_id", "=", eventId)
      .where("campaign_type", "=", campaignType)
      .execute()

    return true
  },
)

export const updateCampaignError = composable(
  async (
    eventId: string,
    errorData: CampaignErrorData,
    campaignType: "opening" | "pre_opening",
  ) => {
    await kyselyDb
      .updateTable("event_newsletter_campaigns")
      .set((eb) => ({
        times_attempted: eb("times_attempted", "+", 1),
        last_attempt: new Date().toISOString(),
        last_error: json(errorData),
        updated_at: new Date().toISOString(),
      }))
      .where("event_id", "=", eventId)
      .where("campaign_type", "=", campaignType)
      .execute()

    return true
  },
)

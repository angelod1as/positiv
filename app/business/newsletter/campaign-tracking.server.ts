import { composable } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import { json } from "~/lib/helpers/kysely-helpers"

type CampaignErrorData = {
  step: "campaign_creation" | "send_signal"
  message: string
  timestamp: string
}

export const createCampaignTracking = composable(async (eventId: string) => {
  await kyselyDb
    .insertInto("event_newsletter_campaigns")
    .values({
      event_id: eventId,
      campaign_is_created: false,
      campaign_is_sent: false,
      times_attempted: 0,
    })
    .onConflict((oc) => oc.column("event_id").doNothing())
    .execute()

  return true
})

export const getPendingCampaigns = composable(async () => {
  const campaigns = await kyselyDb
    .selectFrom("event_newsletter_campaigns")
    .selectAll()
    .where("times_attempted", "<", 3)
    .where((eb) =>
      eb.or([
        eb("campaign_is_created", "=", false),
        eb("campaign_is_sent", "=", false),
      ]),
    )
    .execute()

  return campaigns
})

export const updateCampaignCreated = composable(
  async (eventId: string, campaignId: string) => {
    await kyselyDb
      .updateTable("event_newsletter_campaigns")
      .set({
        campaign_is_created: true,
        campaign_creation_time: new Date().toISOString(),
        campaign_id: campaignId,
        updated_at: new Date().toISOString(),
      })
      .where("event_id", "=", eventId)
      .execute()

    return true
  },
)

export const updateCampaignSent = composable(async (eventId: string) => {
  await kyselyDb
    .updateTable("event_newsletter_campaigns")
    .set({
      campaign_is_sent: true,
      campaign_sent_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where("event_id", "=", eventId)
    .execute()

  return true
})

export const updateCampaignError = composable(
  async (eventId: string, errorData: CampaignErrorData) => {
    await kyselyDb
      .updateTable("event_newsletter_campaigns")
      .set((eb) => ({
        times_attempted: eb("times_attempted", "+", 1),
        last_attempt: new Date().toISOString(),
        last_error: json(errorData),
        updated_at: new Date().toISOString(),
      }))
      .where("event_id", "=", eventId)
      .execute()

    return true
  },
)

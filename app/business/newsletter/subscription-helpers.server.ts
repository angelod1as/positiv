import { composable } from "composable-functions"
import { db } from "~/lib/supabase/db.server"
import type { SubscriptionSource, SyncStatus } from "./types"

export const getSubscriptionStatus = composable(async (profileId: string) => {
  return await db
    .selectFrom("newsletter_subscriptions")
    .selectAll()
    .where("profile_id", "=", profileId)
    .executeTakeFirst()
    .then((result) => result ?? null)
})

export const subscribeProfile = composable(
  async (profileId: string, source: SubscriptionSource) => {
    const result = await getSubscriptionStatus(profileId)

    if (result.success && result.data) {
      if (result.data.consent_given) {
        return result.data
      }

      const nowIso = new Date().toISOString()
      const updatedSubscription = await db
        .updateTable("newsletter_subscriptions")
        .set((eb) => ({
          consent_given: true,
          first_consent_given_at: eb.fn.coalesce(
            "first_consent_given_at",
            eb.val(nowIso),
          ),
          last_consent_given_at: nowIso,
          subscribed_at: nowIso,
          subscription_source: source,
          sync_status: "pending" as SyncStatus,
          unsubscribed_at: null,
        }))
        .where("profile_id", "=", profileId)
        .returningAll()
        .executeTakeFirstOrThrow()

      return updatedSubscription
    }

    const nowIso = new Date().toISOString()
    const newSubscription = await db
      .insertInto("newsletter_subscriptions")
      .values({
        profile_id: profileId,
        consent_given: true,
        first_consent_given_at: nowIso,
        last_consent_given_at: nowIso,
        subscribed_at: nowIso,
        subscription_source: source,
        sync_status: "pending" as SyncStatus,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return newSubscription
  },
)

export const unsubscribeProfile = composable(async (profileId: string) => {
  const result = await getSubscriptionStatus(profileId)

  if (!result.success) {
    throw new Error("No subscription found")
  }

  if (!result.data) {
    throw new Error("No subscription found")
  }

  const updatedSubscription = await db
    .updateTable("newsletter_subscriptions")
    .set({
      consent_given: false,
      unsubscribed_at: new Date().toISOString(),
      subscription_source: null,
      sync_status: "unsubscribed" as SyncStatus,
    })
    .where("profile_id", "=", profileId)
    .returningAll()
    .executeTakeFirstOrThrow()

  return updatedSubscription
})

export const updateSyncStatus = composable(
  async (
    profileId: string,
    syncStatus: SyncStatus,
    listmonkSubscriberId?: number,
  ) => {
    const result = await getSubscriptionStatus(profileId)

    if (!result.success) {
      throw new Error("No subscription found")
    }

    if (!result.data) {
      throw new Error("No subscription found")
    }

    const nowIso = new Date().toISOString()

    type UpdatePayload = {
      sync_status: SyncStatus
      last_sync_attempt_at: string
      listmonk_subscriber_id?: number
      consent_given?: boolean
      unsubscribed_at?: string | null
    }

    const updatePayload: UpdatePayload = {
      sync_status: syncStatus,
      last_sync_attempt_at: nowIso,
      ...(listmonkSubscriberId !== undefined && {
        listmonk_subscriber_id: listmonkSubscriberId,
      }),
    }

    if (syncStatus === "unsubscribed") {
      updatePayload.consent_given = false
      updatePayload.unsubscribed_at = nowIso
    } else if (syncStatus === "synced" || syncStatus === "pending") {
      updatePayload.consent_given = true
      updatePayload.unsubscribed_at = null
    }

    const updatedSubscription = await db
      .updateTable("newsletter_subscriptions")
      .set(updatePayload)
      .where("profile_id", "=", profileId)
      .returningAll()
      .executeTakeFirstOrThrow()

    return updatedSubscription
  },
)

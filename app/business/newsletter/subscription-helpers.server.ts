import { db } from "~/lib/supabase/db.server"
import type { Database } from "~/types/database/database.types"

type NewsletterSubscription =
  Database["public"]["Tables"]["newsletter_subscriptions"]["Row"]
type SubscriptionSource =
  | "onboarding_auto"
  | "terms_and_conditions"
  | "manual_button"
  | "backfill"
  | "admin"
type SyncStatus = "pending" | "synced" | "failed" | "unsubscribed"

interface SubscriptionResult {
  success: boolean
  subscription?: NewsletterSubscription
  error?: string
}

export async function getSubscriptionStatus(
  profileId: string,
): Promise<NewsletterSubscription | null> {
  return await db
    .selectFrom("newsletter_subscriptions")
    .selectAll()
    .where("profile_id", "=", profileId)
    .executeTakeFirst()
    .then((result) => result ?? null)
}

export async function subscribeProfile(
  profileId: string,
  source: SubscriptionSource,
): Promise<SubscriptionResult> {
  try {
    const existingSubscription = await getSubscriptionStatus(profileId)

    if (existingSubscription) {
      if (existingSubscription.consent_given) {
        return {
          success: true,
          subscription: existingSubscription,
        }
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

      return {
        success: true,
        subscription: updatedSubscription,
      }
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

    return {
      success: true,
      subscription: newSubscription,
    }
  } catch (error) {
    console.error("Error subscribing profile:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function unsubscribeProfile(
  profileId: string,
): Promise<SubscriptionResult> {
  try {
    const existingSubscription = await getSubscriptionStatus(profileId)

    if (!existingSubscription) {
      return {
        success: false,
        error: "No subscription found",
      }
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

    return {
      success: true,
      subscription: updatedSubscription,
    }
  } catch (error) {
    console.error("Error unsubscribing profile:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateSyncStatus(
  profileId: string,
  syncStatus: SyncStatus,
  listmonkSubscriberId?: number,
): Promise<SubscriptionResult> {
  try {
    const existingSubscription = await getSubscriptionStatus(profileId)

    if (!existingSubscription) {
      return {
        success: false,
        error: "No subscription found",
      }
    }

    const nowIso = new Date().toISOString()

    // Build base update payload
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

    // Keep consent fields consistent with sync status
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

    return {
      success: true,
      subscription: updatedSubscription,
    }
  } catch (error) {
    console.error("Error updating sync status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

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

      const updatedSubscription = await db
        .updateTable("newsletter_subscriptions")
        .set({
          consent_given: true,
          subscribed_at: new Date().toISOString(),
          subscription_source: source,
          sync_status: "pending" as SyncStatus,
          unsubscribed_at: null,
          updated_at: new Date().toISOString(),
        })
        .where("profile_id", "=", profileId)
        .returningAll()
        .executeTakeFirstOrThrow()

      return {
        success: true,
        subscription: updatedSubscription,
      }
    }

    const newSubscription = await db
      .insertInto("newsletter_subscriptions")
      .values({
        profile_id: profileId,
        consent_given: true,
        consent_given_at: new Date().toISOString(),
        subscribed_at: new Date().toISOString(),
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
        updated_at: new Date().toISOString(),
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

    const updatedSubscription = await db
      .updateTable("newsletter_subscriptions")
      .set({
        sync_status: syncStatus,
        last_sync_attempt_at: new Date().toISOString(),
        ...(listmonkSubscriberId !== undefined && {
          listmonk_subscriber_id: listmonkSubscriberId,
        }),
        updated_at: new Date().toISOString(),
      })
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

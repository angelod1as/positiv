/**
 * Newsletter Sync Retry Service
 *
 * Automatically retries failed Listmonk newsletter syncs with exponential backoff.
 *
 * Triggered by pg_cron job 'retry-failed-newsletter-syncs' every 30 minutes.
 * See migration: 20260129230800_schedule_newsletter_retry_cron.sql
 *
 * Retry schedule:
 * - Attempt 1: Immediate (0 min)
 * - Attempt 2: 5 minutes
 * - Attempt 3: 15 minutes
 * - Attempt 4: 1 hour
 * - Attempt 5: 6 hours
 * - Max retries: 5
 */

import { composable } from "composable-functions"
import { logger } from "~/lib/logger/logger.server"
import { db } from "~/lib/supabase/db.server"
import { addSubscriber } from "./listmonk-client.server"
import {
  computeSubscriberName,
  updateSyncStatus,
} from "./subscription-helpers.server"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_TEST_LIST_ID,
} from "~/lib/constants/constants"
import {
  DEFAULT_BACKOFF_MINUTES,
  MAX_RETRY_COUNT,
  NEWSLETTER_RETRY_BACKOFF_MINUTES,
} from "./constants"
import type { Database } from "~/types/database/database.types"

type SubscriptionWithProfile = {
  id: string
  profile_id: string
  retry_count: number
  last_sync_attempt_at: string | null
  email: string
  social_name: string | null
  full_name: string | null
  is_veteran: boolean | null
  approved_to_attend: Database["public"]["Enums"]["approved_to_attend_enum"] | null
  user_id: string | null
}

export async function getFailedSubscriptionsForRetry(): Promise<
  SubscriptionWithProfile[]
> {
  const failedSubscriptions = await db
    .selectFrom("newsletter_subscriptions")
    .innerJoin("profiles", "profiles.id", "newsletter_subscriptions.profile_id")
    .select([
      "newsletter_subscriptions.id",
      "newsletter_subscriptions.profile_id",
      "newsletter_subscriptions.retry_count",
      "newsletter_subscriptions.last_sync_attempt_at",
      "profiles.email",
      "profiles.social_name",
      "profiles.full_name",
      "profiles.is_veteran",
      "profiles.approved_to_attend",
      "profiles.user_id",
    ])
    .where("newsletter_subscriptions.sync_status", "=", "failed")
    .where("newsletter_subscriptions.retry_count", "<", MAX_RETRY_COUNT)
    .execute()

  return failedSubscriptions
}

function getBackoffMinutes(retryCount: number): number {
  return NEWSLETTER_RETRY_BACKOFF_MINUTES[retryCount] ?? DEFAULT_BACKOFF_MINUTES
}

export function shouldRetrySubscription(
  lastAttemptAt: string | null,
  retryCount: number,
): boolean {
  if (!lastAttemptAt) return true

  const backoffMinutes = getBackoffMinutes(retryCount)
  const lastAttemptTime = new Date(lastAttemptAt).getTime()
  const backoffMilliseconds = backoffMinutes * 60 * 1000
  const nextRetryTime = new Date(lastAttemptTime + backoffMilliseconds)

  return new Date() >= nextRetryTime
}

async function retrySubscriptionSync(
  subscription: SubscriptionWithProfile,
): Promise<{
  success: boolean
  profileId: string
  errors?: unknown[]
}> {
  const computedName = computeSubscriberName(
    subscription.social_name,
    subscription.full_name,
    subscription.email,
  )

  const isTestUser = subscription.email.endsWith("@example.com")
  const lists = isTestUser
    ? [LISTMONK_REGISTERED_LIST_ID, LISTMONK_TEST_LIST_ID]
    : [LISTMONK_REGISTERED_LIST_ID]

  let result
  try {
    result = await addSubscriber({
      email: subscription.email,
      name: computedName,
      lists,
      attributes: {
        profile_id: subscription.profile_id,
        user_id: subscription.user_id,
        social_name: subscription.social_name,
        full_name: subscription.full_name,
        name: computedName,
        is_veteran: subscription.is_veteran,
        approved_to_attend: subscription.approved_to_attend,
        synced_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    // Handle thrown errors from addSubscriber
    await db
      .updateTable("newsletter_subscriptions")
      .set({
        retry_count: subscription.retry_count + 1,
        last_sync_attempt_at: new Date().toISOString(),
      })
      .where("id", "=", subscription.id)
      .where("sync_status", "=", "failed")
      .execute()

    return {
      success: false,
      profileId: subscription.profile_id,
      errors: [err instanceof Error ? err.message : err],
    }
  }

  if (result.success) {
    await updateSyncStatus(
      subscription.profile_id,
      "synced",
      result.data.subscriberId,
    )
    return { success: true, profileId: subscription.profile_id }
  } else {
    // Increment retry count and update timestamp
    // Only update if still in failed status to avoid race conditions
    await db
      .updateTable("newsletter_subscriptions")
      .set({
        retry_count: subscription.retry_count + 1,
        last_sync_attempt_at: new Date().toISOString(),
      })
      .where("id", "=", subscription.id)
      .where("sync_status", "=", "failed")
      .execute()

    return {
      success: false,
      profileId: subscription.profile_id,
      errors: result.errors,
    }
  }
}

export const processFailedSyncRetries = composable(async () => {
  const failedSubs = await getFailedSubscriptionsForRetry()

  if (!failedSubs || failedSubs.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    }
  }

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  }

  for (const sub of failedSubs) {
    if (!shouldRetrySubscription(sub.last_sync_attempt_at, sub.retry_count)) {
      results.skipped++
      continue
    }

    const result = await retrySubscriptionSync(sub)
    results.processed++

    if (result.success) {
      results.succeeded++
      logger.info(
        `Successfully retried newsletter sync (attempt ${sub.retry_count + 1})`,
        {
          profileId: sub.profile_id,
          subscriptionId: sub.id,
          retryCount: sub.retry_count,
        },
      )
    } else {
      results.failed++
      logger.warn(
        `Failed to retry newsletter sync (attempt ${sub.retry_count + 1})`,
        {
          profileId: sub.profile_id,
          subscriptionId: sub.id,
          retryCount: sub.retry_count,
          errors: result.errors,
        },
      )
    }
  }

  return results
})

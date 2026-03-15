import { composable } from "composable-functions"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_TEST_LIST_ID,
} from "~/lib/constants/constants"
import { logger } from "~/lib/logger/logger.server"
import { db } from "~/lib/supabase/db.server"
import { addSubscriber } from "./listmonk-client.server"
import {
  computeSubscriberName,
  subscribeProfile,
  updateSyncStatus,
} from "./subscription-helpers.server"
import type { SubscriptionSource } from "./types"

export const subscribeProfileToNewsletter = composable(
  async (profileId: string, source: SubscriptionSource) => {
    const profile = await db
      .selectFrom("profiles")
      .select([
        "id",
        "email",
        "user_id",
        "social_name",
        "full_name",
        "is_veteran",
        "approved_to_attend",
      ])
      .where("id", "=", profileId)
      .executeTakeFirst()

    if (!profile) {
      throw new Error("Profile not found")
    }

    await subscribeProfile(profileId, source)

    const computedName = computeSubscriberName(
      profile.social_name,
      profile.full_name,
      profile.email,
    )

    if (!profile.full_name && !profile.social_name) {
      logger.warn(
        "Newsletter sync: Profile has no full_name or social_name, using email as name",
        {
          profileId: profile.id,
          email: profile.email,
          source,
        },
      )
    }

    const isTestUser = profile.email.endsWith("@example.com")
    const lists = isTestUser
      ? [LISTMONK_REGISTERED_LIST_ID, LISTMONK_TEST_LIST_ID]
      : [LISTMONK_REGISTERED_LIST_ID]

    const listmonkResult = await addSubscriber({
      email: profile.email,
      name: computedName,
      lists,
      attributes: {
        profile_id: profile.id,
        user_id: profile.user_id,
        social_name: profile.social_name,
        full_name: profile.full_name,
        name: computedName,
        is_veteran: profile.is_veteran,
        approved_to_attend: profile.approved_to_attend,
        synced_at: new Date().toISOString(),
      },
    })

    if (!listmonkResult.success) {
      await updateSyncStatus(profileId, "failed")
      logger.warn(
        `Failed to subscribe profile to newsletter: Failed to sync with newsletter service`,
        {
          profileId,
          email: profile.email,
          errors: listmonkResult.errors?.map(e => e.message) ?? []
        },
      )
      // Failed syncs are automatically retried by the retry-failed-newsletter-syncs cron job
      // See: app/business/newsletter/retry-failed-syncs.server.ts
      // Cron schedule: Every 30 minutes with exponential backoff (max 5 retries)
      // Don't throw - allow subscription to succeed even if sync fails
      // The subscription record is created and can be synced later
      return { syncStatus: "failed" as const }
    }

    const { subscriberId } = listmonkResult.data
    await updateSyncStatus(profileId, "synced", subscriberId)
    return { syncStatus: "synced" as const }
  },
)

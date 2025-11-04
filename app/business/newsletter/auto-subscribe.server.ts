import { db } from "~/lib/supabase/db.server"
import { addSubscriber } from "./listmonk-client.server"
import { subscribeProfile, updateSyncStatus } from "./subscription-helpers.server"

type SubscriptionSource =
  | "onboarding_auto"
  | "terms_and_conditions"
  | "manual_button"
  | "backfill"
  | "admin"

interface SubscriptionResult {
  success: boolean
  error?: string
}

function computeNameFromFullName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName
}

export async function subscribeProfileToNewsletter(
  profileId: string,
  source: SubscriptionSource
): Promise<SubscriptionResult> {
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
    return {
      success: false,
      error: "Profile not found",
    }
  }

  const subscriptionResult = await subscribeProfile(profileId, source)
  if (!subscriptionResult.success) {
    return {
      success: false,
      error: subscriptionResult.error,
    }
  }

  const computedName =
    profile.social_name || (profile.full_name ? computeNameFromFullName(profile.full_name) : profile.email)

  const listmonkResult = await addSubscriber({
    email: profile.email,
    name: computedName,
    lists: [1],
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
    return {
      success: false,
      error: "Failed to sync with newsletter service",
    }
  }

  await updateSyncStatus(profileId, "synced")

  return { success: true }
}

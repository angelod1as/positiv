import { db } from "~/lib/supabase/db.server"

interface UnsubscribeResult {
  success: boolean
  profileId?: string
  alreadyUnsubscribed?: boolean
  error?: "profile_not_found" | "database_error"
}

export async function processUnsubscribe(
  profileId: string,
  source: string = "email_link",
  ipAddress?: string,
  userAgent?: string
): Promise<UnsubscribeResult> {
  try {
    const profile = await db
      .selectFrom("profiles")
      .select(["id", "allow_marketing_email"])
      .where("id", "=", profileId)
      .executeTakeFirst()

    if (!profile) {
      return { success: false, error: "profile_not_found" }
    }

    const alreadyUnsubscribed = !profile.allow_marketing_email

    if (!alreadyUnsubscribed) {
      await db
        .updateTable("profiles")
        .set({ allow_marketing_email: false })
        .where("id", "=", profileId)
        .execute()
    }

    await db
      .insertInto("unsubscribe_logs")
      .values({
        profile_id: profileId,
        source,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .execute()

    return {
      success: true,
      profileId,
      alreadyUnsubscribed,
    }
  } catch (error) {
    console.error("Error processing unsubscribe:", error)
    return { success: false, error: "database_error" }
  }
}

export async function getUnsubscribeLog(
  profileId: string
) {
  try {
    const logs = await db
      .selectFrom("unsubscribe_logs")
      .selectAll()
      .where("profile_id", "=", profileId)
      .orderBy("unsubscribed_at", "desc")
      .execute()

    return logs
  } catch (error) {
    console.error("Error fetching unsubscribe logs:", error)
    return []
  }
}
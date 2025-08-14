import { composable, pipe } from "composable-functions"
import { db } from "~/lib/supabase/db.server"
import type { Transaction } from "kysely"
import type { Database } from "~/types/database/kysely.types"

interface UnsubscribeInput {
  profileId: string
  source?: string
  ipAddress?: string
  userAgent?: string
}

// Composable function to fetch profile
const fetchProfile = composable(
  async (input: UnsubscribeInput & { trx: Transaction<Database> }) => {
    const profile = await input.trx
      .selectFrom("profiles")
      .select(["id", "allow_marketing_email"])
      .where("id", "=", input.profileId)
      .executeTakeFirst()

    if (!profile) {
      throw new Error("Profile not found")
    }

    return {
      ...input,
      profile,
      alreadyUnsubscribed: !profile.allow_marketing_email,
    }
  }
)

// Composable function to update profile
const updateProfileIfNeeded = composable(
  async (input: { 
    trx: Transaction<Database>
    profile: { id: string; allow_marketing_email: boolean | null }
    alreadyUnsubscribed: boolean
    profileId: string
    source?: string
    ipAddress?: string
    userAgent?: string
  }) => {
    if (!input.alreadyUnsubscribed) {
      await input.trx
        .updateTable("profiles")
        .set({ allow_marketing_email: false })
        .where("id", "=", input.profileId)
        .execute()
    }
    return input
  }
)

// Composable function to log unsubscribe event
const logUnsubscribeEvent = composable(
  async (input: {
    trx: Transaction<Database>
    profileId: string
    source?: string
    ipAddress?: string
    userAgent?: string
    alreadyUnsubscribed: boolean
  }) => {
    await input.trx
      .insertInto("unsubscribe_logs")
      .values({
        profile_id: input.profileId,
        source: input.source || "email_link",
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
      })
      .execute()

    return {
      profileId: input.profileId,
      alreadyUnsubscribed: input.alreadyUnsubscribed,
    }
  }
)

// Main composable function using pipe
const processUnsubscribeTransaction = pipe(
  fetchProfile,
  updateProfileIfNeeded,
  logUnsubscribeEvent
)

export async function processUnsubscribe(
  profileId: string,
  source: string = "email_link",
  ipAddress?: string,
  userAgent?: string
): Promise<
  | { success: true; profileId: string; alreadyUnsubscribed: boolean }
  | { success: false; error: "profile_not_found" | "database_error" }
> {
  const result = await db.transaction().execute(async (trx) => {
    const transactionResult = await processUnsubscribeTransaction({
      profileId,
      source,
      ipAddress,
      userAgent,
      trx,
    })

    return transactionResult
  })

  if (result.success) {
    return {
      success: true as const,
      ...result.data
    }
  }

  // Log error for debugging but return generic error to client
  console.error("Error processing unsubscribe:", result.errors)
  const errorMessage = result.errors[0]?.message || "Unknown error"
  return { 
    success: false, 
    error: errorMessage === "Profile not found" 
      ? "profile_not_found" as const
      : "database_error" as const
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
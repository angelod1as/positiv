import { composable } from "composable-functions"
import { db } from "~/lib/supabase/db.server"

/**
 * A refusal with no subscription behind it has nothing in
 * newsletter_subscriptions to carry it, so it is written to email_consents
 * directly: declined, not never asked.
 */
export const recordNewsletterRefusal = composable(async (profileId: string) => {
  await db
    .updateTable("email_consents")
    .set({ newsletter: false, newsletter_at: new Date().toISOString() })
    .where("profile_id", "=", profileId)
    .execute()
})

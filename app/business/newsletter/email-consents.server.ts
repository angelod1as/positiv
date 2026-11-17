import { composable } from "composable-functions"
import { db } from "~/lib/supabase/db.server"

/**
 * A refusal with no subscription behind it has nothing in
 * newsletter_subscriptions to carry it, so it is written to email_consents
 * directly: declined, not never asked. A refusal already on record keeps its
 * date, as the mirror trigger does.
 */
export const recordNewsletterRefusal = composable(async (profileId: string) => {
  await db
    .insertInto("email_consents")
    .values({
      profile_id: profileId,
      newsletter: false,
      newsletter_at: new Date().toISOString(),
    })
    .onConflict((oc) =>
      oc
        .column("profile_id")
        .doUpdateSet({
          newsletter: false,
          newsletter_at: (eb) => eb.ref("excluded.newsletter_at"),
        })
        .where((eb) =>
          eb.or([
            eb("email_consents.newsletter", "=", true),
            eb("email_consents.newsletter_at", "is", null),
          ]),
        ),
    )
    .execute()
})

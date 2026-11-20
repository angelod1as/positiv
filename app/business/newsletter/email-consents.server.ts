import { composable } from "composable-functions"
import { db } from "~/lib/supabase/db.server"

/**
 * A refusal with no subscription behind it has nothing in
 * newsletter_subscriptions to carry it, so it is written to email_consents
 * directly: declined, not never asked. Registration alerts and Marketing are
 * separate choices and are left alone. An answer already on record keeps its
 * date.
 */
export const recordNewsletterRefusal = composable(async (profileId: string) => {
  const now = new Date().toISOString()

  await db
    .insertInto("email_consents")
    .values({
      profile_id: profileId,
      newsletter: false,
      newsletter_at: now,
    })
    .onConflict((oc) =>
      oc.column("profile_id").doUpdateSet((eb) => ({
        newsletter: false,
        newsletter_at: eb
          .case()
          .when(
            eb.or([
              eb("email_consents.newsletter", "=", true),
              eb("email_consents.newsletter_at", "is", null),
            ]),
          )
          .then(eb.ref("excluded.newsletter_at"))
          .else(eb.ref("email_consents.newsletter_at"))
          .end(),
      })),
    )
    .execute()
})

import { composable } from "composable-functions"
import { logger } from "~/lib/logger/logger.server"
import { db } from "~/lib/supabase/db.server"
import { setSubscriberAttribs } from "./listmonk-client.server"
import { getAllSubscribers } from "./listmonk-lists.server"

/**
 * Gives every Listmonk subscriber with a profile behind it the profile's
 * email_consents.access_token as the `email_token` attribute, which the
 * footer of every template puts in its link to /emails (WEB-53). A
 * subscriber is matched by its profile_id attribute, or by email when it has
 * none. Only subscribers whose token is missing or different are written, so
 * after the first run there is nothing to do but newcomers.
 */
export const syncEmailTokensToListmonk = composable(async () => {
  const profiles = await db
    .selectFrom("profiles as p")
    .innerJoin("email_consents as ec", "ec.profile_id", "p.id")
    .select(["p.id", "p.email", "ec.access_token as email_token"])
    .execute()

  const subscribers = await getAllSubscribers()
  if (!subscribers.success) {
    throw new Error(
      subscribers.errors[0]?.message ?? "Failed to read the Listmonk subscribers",
    )
  }

  const byId = new Map(profiles.map((profile) => [profile.id, profile]))
  const byEmail = new Map(
    profiles.map((profile) => [profile.email.trim().toLowerCase(), profile]),
  )

  let updated = 0
  let failed = 0
  for (const subscriber of subscribers.data) {
    const profileId = subscriber.attribs?.profile_id
    const profile =
      (typeof profileId === "string" ? byId.get(profileId) : undefined) ??
      byEmail.get(subscriber.email.trim().toLowerCase())

    if (!profile || subscriber.attribs?.email_token === profile.email_token) {
      continue
    }

    const result = await setSubscriberAttribs(subscriber, {
      email_token: profile.email_token,
    })
    if (result.success) {
      updated++
    } else {
      failed++
      logger.warn("Could not give a Listmonk subscriber its email token", {
        subscriberId: subscriber.id,
        errors: result.errors.map((error) => error.message),
      })
    }
  }

  return { updated, failed }
})

import { composable } from "composable-functions"
import { LISTMONK_REGISTRATION_ALERTS_LIST_ID } from "~/lib/constants/constants"
import { db } from "~/lib/supabase/db.server"
import { subscriberAttributes } from "./auto-subscribe.server"
import {
  addSubscriber,
  addSubscribersToListBulk,
  removeSubscribersFromListBulk,
} from "./listmonk-client.server"
import { getAllSubscribers, getListSubscribers } from "./listmonk-lists.server"
import { computeSubscriberName } from "./subscription-helpers.server"

export async function getRegistrationAlertsProfiles() {
  return await db
    .selectFrom("email_consents as ec")
    .innerJoin("profiles as p", "p.id", "ec.profile_id")
    .select([
      "p.id",
      "p.email",
      "p.user_id",
      "p.social_name",
      "p.full_name",
      "p.is_veteran",
      "p.approved_to_attend",
    ])
    .where("ec.registration_alerts", "=", true)
    .execute()
}

async function unwrap<T>(
  result: Promise<
    { success: true; data: T } | { success: false; errors: Error[] }
  >,
  description: string,
): Promise<T> {
  const settled = await result
  if (!settled.success) {
    throw new Error(settled.errors[0]?.message ?? `Failed to ${description}`)
  }
  return settled.data
}

const normalize = (email: string) => email.trim().toLowerCase()

/**
 * Brings the Registration alerts Listmonk list in line with the site, where
 * the consent lives. Whoever has alerts on joins the list, created in
 * Listmonk if they are not there yet; whoever has them off leaves it. Someone
 * who left the list in Listmonk or is blocklisted is never put back: the
 * unsubscribe sync carries that back to the site first.
 */
export const syncRegistrationAlertsListmonkList = composable(async () => {
  const profiles = await getRegistrationAlertsProfiles()

  const everyone = await unwrap(
    getAllSubscribers(),
    "read the Listmonk subscribers",
  )
  const leftIds = new Set(
    (
      await unwrap(
        getListSubscribers(LISTMONK_REGISTRATION_ALERTS_LIST_ID, "unsubscribed"),
        "read who left the Registration alerts list",
      )
    ).map((subscriber) => subscriber.id),
  )
  const currentIds = new Set(
    (
      await unwrap(
        getListSubscribers(LISTMONK_REGISTRATION_ALERTS_LIST_ID),
        "read the Registration alerts list",
      )
    ).map((subscriber) => subscriber.id),
  )

  const byEmail = new Map(
    everyone.map((subscriber) => [normalize(subscriber.email), subscriber]),
  )

  const eligibleIds = new Set<number>()
  const toCreate: typeof profiles = []
  for (const profile of profiles) {
    const subscriber = byEmail.get(normalize(profile.email))
    if (!subscriber) {
      toCreate.push(profile)
    } else if (
      subscriber.status !== "blocklisted" &&
      !leftIds.has(subscriber.id)
    ) {
      eligibleIds.add(subscriber.id)
    }
  }

  if (eligibleIds.size === 0 && toCreate.length === 0 && currentIds.size > 0) {
    throw new Error(
      `Refusing to empty the Registration alerts list: no one is eligible but it has ${currentIds.size} members`,
    )
  }

  const toAdd = [...eligibleIds].filter((id) => !currentIds.has(id))
  const toRemove = [...currentIds].filter((id) => !eligibleIds.has(id))

  if (toAdd.length > 0) {
    await unwrap(
      addSubscribersToListBulk(toAdd, LISTMONK_REGISTRATION_ALERTS_LIST_ID),
      "add subscribers to the Registration alerts list",
    )
  }

  if (toRemove.length > 0) {
    await unwrap(
      removeSubscribersFromListBulk(
        toRemove,
        LISTMONK_REGISTRATION_ALERTS_LIST_ID,
      ),
      "remove subscribers from the Registration alerts list",
    )
  }

  let created = 0
  let failed = 0
  for (const profile of toCreate) {
    const name = computeSubscriberName(
      profile.social_name,
      profile.full_name,
      profile.email,
    )
    const result = await addSubscriber({
      email: profile.email,
      name,
      lists: [LISTMONK_REGISTRATION_ALERTS_LIST_ID],
      attributes: subscriberAttributes(profile, name),
    })
    if (result.success) {
      created++
    } else {
      failed++
    }
  }

  return {
    added: toAdd.length,
    removed: toRemove.length,
    created,
    failed,
  }
})

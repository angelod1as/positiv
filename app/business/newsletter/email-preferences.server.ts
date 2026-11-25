import { composable } from "composable-functions"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_REGISTRATION_ALERTS_LIST_ID,
  LISTMONK_VETERANS_LIST_ID,
} from "~/lib/constants/constants"
import { db } from "~/lib/supabase/db.server"
import { getNewsletterProfile, subscriberAttributes } from "./auto-subscribe.server"
import {
  emailPreferencesSchema,
  type EmailPreferences,
} from "./email-preferences-schema"
import {
  addSubscriber,
  enableSubscriber,
  getSubscriberBounceCount,
  getSubscriberById,
  setListMembership,
  type ListmonkSubscriberDetails,
} from "./listmonk-client.server"
import {
  computeSubscriberName,
  subscribeProfile,
  updateSyncStatus,
} from "./subscription-helpers.server"
import type { SubscriptionSource } from "./types"

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The "Seus e-mails" page opens either from the token in an email footer or
 * for the person logged in. Someone who never answered any category sees
 * everything ticked; anyone else sees what is on record.
 */
export const findEmailPreferences = composable(
  async (
    who: { token: string } | { profileId: string },
  ): Promise<{
    profileId: string
    email: string
    preferences: EmailPreferences
  } | null> => {
    if ("token" in who && !UUID.test(who.token)) {
      return null
    }

    const row = await db
      .selectFrom("email_consents as ec")
      .innerJoin("profiles as p", "p.id", "ec.profile_id")
      .select([
        "p.id",
        "p.email",
        "ec.registration_alerts",
        "ec.registration_alerts_at",
        "ec.newsletter",
        "ec.newsletter_at",
        "ec.marketing",
        "ec.marketing_at",
      ])
      .where(
        "token" in who ? "ec.access_token" : "ec.profile_id",
        "=",
        "token" in who ? who.token : who.profileId,
      )
      .executeTakeFirst()

    if (!row) {
      return null
    }

    const neverAnswered =
      !row.registration_alerts_at && !row.newsletter_at && !row.marketing_at

    return {
      profileId: row.id,
      email: row.email,
      preferences: neverAnswered
        ? { registrationAlerts: true, newsletter: true, marketing: true }
        : {
            registrationAlerts: row.registration_alerts,
            newsletter: row.newsletter,
            marketing: row.marketing,
          },
    }
  },
)

async function recordOnSite(
  profileId: string,
  preferences: EmailPreferences,
  source: SubscriptionSource,
) {
  const subscription = await db
    .selectFrom("newsletter_subscriptions")
    .select(["consent_given", "listmonk_subscriber_id"])
    .where("profile_id", "=", profileId)
    .executeTakeFirst()

  if (preferences.newsletter) {
    const subscribed = await subscribeProfile(profileId, source)
    if (!subscribed.success) {
      throw subscribed.errors[0]
    }
  } else if (subscription?.consent_given) {
    await db
      .updateTable("newsletter_subscriptions")
      .set({
        consent_given: false,
        unsubscribed_at: new Date().toISOString(),
        subscription_source: null,
        sync_status: "unsubscribed",
      })
      .where("profile_id", "=", profileId)
      .execute()
  }

  const now = new Date().toISOString()
  await db
    .insertInto("email_consents")
    .values({
      profile_id: profileId,
      registration_alerts: preferences.registrationAlerts,
      registration_alerts_at: now,
      newsletter: preferences.newsletter,
      newsletter_at: now,
      marketing: preferences.marketing,
      marketing_at: now,
      confirmed_at: now,
    })
    .onConflict((oc) =>
      oc.column("profile_id").doUpdateSet({
        registration_alerts: preferences.registrationAlerts,
        registration_alerts_at: now,
        newsletter: preferences.newsletter,
        newsletter_at: now,
        marketing: preferences.marketing,
        marketing_at: now,
        confirmed_at: now,
      }),
    )
    .execute()

  return subscription?.listmonk_subscriber_id ?? null
}

async function unwrap<T>(
  result: Promise<
    { success: true; data: T } | { success: false; errors: Error[] }
  >,
): Promise<T> {
  const settled = await result
  if (!settled.success) {
    throw settled.errors[0] ?? new Error("Listmonk request failed")
  }
  return settled.data
}

/**
 * The stored id follows the person across an email change. Without one, the
 * subscriber is found or created by email once, and its id kept.
 */
async function findSubscriber(
  profileId: string,
  storedId: number | null,
): Promise<ListmonkSubscriberDetails | null> {
  if (storedId) {
    const stored = await unwrap(getSubscriberById(storedId))
    if (stored) {
      return stored
    }
  }

  const profile = await getNewsletterProfile(profileId)
  const name = computeSubscriberName(
    profile.social_name,
    profile.full_name,
    profile.email,
  )
  const { subscriberId } = await unwrap(
    addSubscriber({
      email: profile.email,
      name,
      lists: [],
      attributes: subscriberAttributes(profile, name),
    }),
  )
  if (!subscriberId) {
    return null
  }

  await db
    .insertInto("newsletter_subscriptions")
    .values({
      profile_id: profileId,
      consent_given: false,
      sync_status: "unsubscribed",
      listmonk_subscriber_id: subscriberId,
    })
    .onConflict((oc) =>
      oc
        .column("profile_id")
        .doUpdateSet({ listmonk_subscriber_id: subscriberId }),
    )
    .execute()

  return await unwrap(getSubscriberById(subscriberId))
}

const ACTIVE = new Set(["confirmed", "unconfirmed"])

async function mirrorInListmonk(
  profileId: string,
  storedId: number | null,
  preferences: EmailPreferences,
): Promise<{ bounced: boolean }> {
  const subscriber = await findSubscriber(profileId, storedId)
  if (!subscriber) {
    return { bounced: false }
  }

  const wantsAList = preferences.registrationAlerts || preferences.newsletter

  if (wantsAList && subscriber.status === "blocklisted") {
    if ((await unwrap(getSubscriberBounceCount(subscriber.id))) > 0) {
      return { bounced: true }
    }
    await unwrap(enableSubscriber(subscriber))
  }

  const { is_veteran } = await getNewsletterProfile(profileId)
  const wanted: Array<[number, boolean]> = [
    [LISTMONK_REGISTERED_LIST_ID, preferences.newsletter],
    [LISTMONK_VETERANS_LIST_ID, preferences.newsletter && is_veteran === true],
    [LISTMONK_REGISTRATION_ALERTS_LIST_ID, preferences.registrationAlerts],
  ]

  for (const [listId, on] of wanted) {
    const membership = subscriber.lists.find((list) => list.id === listId)
    const isOn = membership !== undefined && ACTIVE.has(membership.subscription_status)
    if (on !== isOn) {
      await unwrap(setListMembership(subscriber.id, listId, on))
    }
  }

  if (preferences.newsletter) {
    await unwrap(updateSyncStatus(profileId, "synced", subscriber.id))
  }

  return { bounced: false }
}

/**
 * The site half of a save: the three choices, each dated now, and
 * `confirmed_at`. Resolves to the Listmonk subscriber id on record, if any,
 * for `mirrorEmailPreferences`.
 */
export const recordEmailPreferences = composable(
  async (
    profileId: string,
    preferences: EmailPreferences,
    source: SubscriptionSource = "manual_button",
  ): Promise<number | null> => recordOnSite(profileId, preferences, source),
)

/**
 * The Listmonk half of a save, by subscriber id. A block is lifted when the
 * person opts back in, unless Listmonk recorded a bounce: then the address is
 * the problem, and `bounced` says so. Marketing has no list yet (WEB-8:
 * created on first use), so it lives on the site only.
 */
export const mirrorEmailPreferences = composable(mirrorInListmonk)

/**
 * Records the three choices on the site, where consent lives, then brings
 * Listmonk in line.
 */
export const saveEmailPreferences = composable(
  async (profileId: string, answers: unknown): Promise<{ bounced: boolean }> => {
    const preferences = emailPreferencesSchema.parse(answers)

    const storedId = await recordOnSite(profileId, preferences, "manual_button")

    return await mirrorInListmonk(profileId, storedId, preferences)
  },
)

/**
 * Whether someone logged in still has to confirm their email choices: true
 * until they save them, here or at sign-up.
 */
export const needsEmailConfirmation = composable(
  async (profileId: string): Promise<boolean> => {
    const row = await db
      .selectFrom("email_consents")
      .select("confirmed_at")
      .where("profile_id", "=", profileId)
      .executeTakeFirst()

    return !row?.confirmed_at
  },
)

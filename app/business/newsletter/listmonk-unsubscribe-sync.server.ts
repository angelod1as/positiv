/**
 * Listmonk → site consent sync.
 *
 * Listmonk has no outgoing webhooks, so unsubscribes made there — its own
 * unsubscribe link, Gmail's one-click List-Unsubscribe, the admin, bounces —
 * are pulled. Someone unsubscribed from Registered, or blocklisted, has
 * withdrawn newsletter consent; the site follows unless the person consented
 * again on the site after that. Leaving the Registration alerts list, or a
 * block, turns Registration alerts off the same way, and nothing else.
 *
 * Triggered by pg_cron job 'sync-listmonk-unsubscribes' every 30 minutes.
 */

import { composable } from "composable-functions"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_REGISTRATION_ALERTS_LIST_ID,
} from "~/lib/constants/constants"
import { db } from "~/lib/supabase/db.server"
import {
  getBlocklistedSubscribers,
  getListSubscribers,
  type ListSubscriber,
} from "./listmonk-lists.server"

interface OptOut {
  subscriberId: number
  email: string
  optedOutAt: Date
}

async function readOptOuts(
  listId: number = LISTMONK_REGISTERED_LIST_ID,
): Promise<OptOut[]> {
  const leftRegistered = await getListSubscribers(listId, "unsubscribed")
  if (!leftRegistered.success) {
    throw new Error(
      leftRegistered.errors[0]?.message ??
        `Failed to read who left Listmonk list ${listId}`,
    )
  }

  const blocklisted = await getBlocklistedSubscribers()
  if (!blocklisted.success) {
    throw new Error(
      blocklisted.errors[0]?.message ??
        "Failed to read blocklisted Listmonk subscribers",
    )
  }

  const registeredOptOutAt = (subscriber: ListSubscriber) =>
    subscriber.lists.find((list) => list.id === listId)
      ?.subscription_updated_at ?? subscriber.updated_at

  // A block unsubscribes every list at once; the subscriber's own updated_at
  // moves on any later edit, so it would date the block too late.
  const blockedAt = (subscriber: ListSubscriber) =>
    subscriber.lists.reduce<string | null>(
      (latest, list) =>
        latest === null ||
        new Date(list.subscription_updated_at) > new Date(latest)
          ? list.subscription_updated_at
          : latest,
      null,
    ) ?? subscriber.updated_at

  return [
    ...leftRegistered.data.map((subscriber) => ({
      subscriberId: subscriber.id,
      email: subscriber.email.trim().toLowerCase(),
      optedOutAt: new Date(registeredOptOutAt(subscriber)),
    })),
    ...blocklisted.data.map((subscriber) => ({
      subscriberId: subscriber.id,
      email: subscriber.email.trim().toLowerCase(),
      optedOutAt: new Date(blockedAt(subscriber)),
    })),
  ]
}

async function findWithdrawnConsents() {
  const optOuts = await readOptOuts()

  if (optOuts.length === 0) {
    return []
  }

  const byEmail = new Map(optOuts.map((optOut) => [optOut.email, optOut]))
  const bySubscriberId = new Map(
    optOuts.map((optOut) => [optOut.subscriberId, optOut]),
  )

  const consented = await db
    .selectFrom("newsletter_subscriptions as ns")
    .innerJoin("profiles as p", "p.id", "ns.profile_id")
    .select([
      "ns.id",
      "ns.listmonk_subscriber_id",
      "ns.last_consent_given_at",
      "ns.subscribed_at",
      "p.email",
    ])
    .where("ns.consent_given", "=", true)
    .where((eb) =>
      eb.or([
        eb(eb.fn("lower", ["p.email"]), "in", [...byEmail.keys()]),
        eb("ns.listmonk_subscriber_id", "in", [...bySubscriberId.keys()]),
      ]),
    )
    .execute()

  return consented.flatMap((row) => {
    const optOut =
      (row.listmonk_subscriber_id !== null
        ? bySubscriberId.get(row.listmonk_subscriber_id)
        : undefined) ?? byEmail.get(row.email.trim().toLowerCase())

    if (!optOut) {
      return []
    }

    const consentedAt = row.last_consent_given_at ?? row.subscribed_at
    if (consentedAt && new Date(consentedAt) >= optOut.optedOutAt) {
      return []
    }

    return [{ subscriptionId: row.id, email: row.email, optedOutAt: optOut.optedOutAt }]
  })
}

// Re-checks the condition in the UPDATE, so a consent given on the site
// after findWithdrawnConsents read the row is never overwritten.
export async function withdrawConsentIfStale(
  subscriptionId: string,
  optedOutAt: Date,
): Promise<boolean> {
  const optedOutAtIso = optedOutAt.toISOString()

  const result = await db
    .updateTable("newsletter_subscriptions")
    .set({
      consent_given: false,
      unsubscribed_at: optedOutAtIso,
      subscription_source: null,
      sync_status: "unsubscribed",
    })
    .where("id", "=", subscriptionId)
    .where("consent_given", "=", true)
    .where((eb) =>
      eb.or([
        eb(
          eb.fn.coalesce("last_consent_given_at", "subscribed_at"),
          "is",
          null,
        ),
        eb(
          eb.fn.coalesce("last_consent_given_at", "subscribed_at"),
          "<",
          optedOutAtIso,
        ),
      ]),
    )
    .executeTakeFirst()

  return Number(result.numUpdatedRows) > 0
}

// Leaving the Registration alerts list, or a block, turns Registration alerts
// off and nothing else. Matched by e-mail or, when the profile has one, by its
// Listmonk subscriber ID.
async function findAlertsToTurnOff() {
  const optOuts = await readOptOuts(LISTMONK_REGISTRATION_ALERTS_LIST_ID)

  if (optOuts.length === 0) {
    return []
  }

  const byEmail = new Map(optOuts.map((optOut) => [optOut.email, optOut]))
  const bySubscriberId = new Map(
    optOuts.map((optOut) => [optOut.subscriberId, optOut]),
  )

  const alertsOn = await db
    .selectFrom("email_consents as ec")
    .innerJoin("profiles as p", "p.id", "ec.profile_id")
    .leftJoin("newsletter_subscriptions as ns", "ns.profile_id", "ec.profile_id")
    .select([
      "ec.profile_id",
      "ec.registration_alerts_at",
      "ns.listmonk_subscriber_id",
      "p.email",
    ])
    .where("ec.registration_alerts", "=", true)
    .where((eb) =>
      eb.or([
        eb(eb.fn("lower", ["p.email"]), "in", [...byEmail.keys()]),
        eb("ns.listmonk_subscriber_id", "in", [...bySubscriberId.keys()]),
      ]),
    )
    .execute()

  return alertsOn.flatMap((row) => {
    const optOut =
      (row.listmonk_subscriber_id !== null
        ? bySubscriberId.get(row.listmonk_subscriber_id)
        : undefined) ?? byEmail.get(row.email.trim().toLowerCase())

    if (!optOut) {
      return []
    }

    if (
      row.registration_alerts_at &&
      new Date(row.registration_alerts_at) >= optOut.optedOutAt
    ) {
      return []
    }

    return [{ profileId: row.profile_id, optedOutAt: optOut.optedOutAt }]
  })
}

// Re-checks the condition in the UPDATE, so alerts turned on again on the
// site after findAlertsToTurnOff read the row stay on.
async function turnAlertsOffIfStale(
  profileId: string,
  optedOutAt: Date,
): Promise<boolean> {
  const optedOutAtIso = optedOutAt.toISOString()

  const result = await db
    .updateTable("email_consents")
    .set({ registration_alerts: false, registration_alerts_at: optedOutAtIso })
    .where("profile_id", "=", profileId)
    .where("registration_alerts", "=", true)
    .where((eb) =>
      eb.or([
        eb("registration_alerts_at", "is", null),
        eb("registration_alerts_at", "<", optedOutAtIso),
      ]),
    )
    .executeTakeFirst()

  return Number(result.numUpdatedRows) > 0
}

export const syncListmonkUnsubscribes = composable(
  async (): Promise<{ unsubscribed: number; alertsTurnedOff: number }> => {
    const withdrawn = await findWithdrawnConsents()

    let unsubscribed = 0
    for (const consent of withdrawn) {
      if (await withdrawConsentIfStale(consent.subscriptionId, consent.optedOutAt)) {
        unsubscribed++
      }
    }

    let alertsTurnedOff = 0
    for (const alerts of await findAlertsToTurnOff()) {
      if (await turnAlertsOffIfStale(alerts.profileId, alerts.optedOutAt)) {
        alertsTurnedOff++
      }
    }

    return { unsubscribed, alertsTurnedOff }
  },
)

async function findSubscribedOnlyInListmonk() {
  const registered = await getListSubscribers(LISTMONK_REGISTERED_LIST_ID)
  if (!registered.success) {
    throw new Error(
      registered.errors[0]?.message ?? "Failed to read the Registered list",
    )
  }

  const consented = await db
    .selectFrom("newsletter_subscriptions as ns")
    .innerJoin("profiles as p", "p.id", "ns.profile_id")
    .select("p.email")
    .where("ns.consent_given", "=", true)
    .execute()
  const consentedEmails = new Set(
    consented.map((row) => row.email.trim().toLowerCase()),
  )

  return registered.data
    .filter(
      (subscriber) =>
        subscriber.status !== "blocklisted" &&
        !consentedEmails.has(subscriber.email.trim().toLowerCase()),
    )
    .map((subscriber) => ({
      email: subscriber.email.trim().toLowerCase(),
      subscriberId: subscriber.id,
    }))
}

/**
 * Read-only: the consents the sync would withdraw, and who Listmonk still
 * sends the newsletter to without consent on the site — the second list is
 * for a person to review, never fixed automatically.
 */
export const reportConsentDrift = composable(async () => {
  const withdrawn = await findWithdrawnConsents()

  return {
    withdrawnInListmonk: withdrawn.map((consent) => ({
      email: consent.email,
      optedOutAt: consent.optedOutAt.toISOString(),
    })),
    subscribedOnlyInListmonk: await findSubscribedOnlyInListmonk(),
  }
})

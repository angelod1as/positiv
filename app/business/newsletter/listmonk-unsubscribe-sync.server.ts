/**
 * Listmonk → site consent sync.
 *
 * Listmonk has no outgoing webhooks, so unsubscribes made there — its own
 * unsubscribe link, Gmail's one-click List-Unsubscribe, the admin, bounces —
 * are pulled. Someone unsubscribed from Registered, or blocklisted, has
 * withdrawn newsletter consent; the site follows unless the person consented
 * again on the site after that.
 *
 * Triggered by pg_cron job 'sync-listmonk-unsubscribes' every 30 minutes.
 */

import { composable } from "composable-functions"
import { LISTMONK_REGISTERED_LIST_ID } from "~/lib/constants/constants"
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

async function readOptOuts(): Promise<OptOut[]> {
  const leftRegistered = await getListSubscribers(
    LISTMONK_REGISTERED_LIST_ID,
    "unsubscribed",
  )
  if (!leftRegistered.success) {
    throw new Error(
      leftRegistered.errors[0]?.message ??
        "Failed to read who left the Registered list",
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
    subscriber.lists?.find((list) => list.id === LISTMONK_REGISTERED_LIST_ID)
      ?.subscription_updated_at ?? subscriber.updated_at

  return [
    ...leftRegistered.data.map((subscriber) => ({
      subscriberId: subscriber.id,
      email: subscriber.email.trim().toLowerCase(),
      optedOutAt: new Date(registeredOptOutAt(subscriber)),
    })),
    ...blocklisted.data.map((subscriber) => ({
      subscriberId: subscriber.id,
      email: subscriber.email.trim().toLowerCase(),
      optedOutAt: new Date(subscriber.updated_at),
    })),
  ]
}

export const syncListmonkUnsubscribes = composable(
  async (): Promise<{ unsubscribed: number }> => {
    const optOuts = await readOptOuts()

    if (optOuts.length === 0) {
      return { unsubscribed: 0 }
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

    let unsubscribed = 0

    for (const row of consented) {
      const optOut =
        (row.listmonk_subscriber_id !== null
          ? bySubscriberId.get(row.listmonk_subscriber_id)
          : undefined) ?? byEmail.get(row.email.trim().toLowerCase())

      if (!optOut) {
        continue
      }

      const consentedAt = row.last_consent_given_at ?? row.subscribed_at
      if (consentedAt && new Date(consentedAt) >= optOut.optedOutAt) {
        continue
      }

      await db
        .updateTable("newsletter_subscriptions")
        .set({
          consent_given: false,
          unsubscribed_at: optOut.optedOutAt.toISOString(),
          subscription_source: null,
          sync_status: "unsubscribed",
        })
        .where("id", "=", row.id)
        .execute()

      unsubscribed++
    }

    return { unsubscribed }
  },
)

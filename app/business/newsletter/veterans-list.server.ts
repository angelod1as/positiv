import { composable } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_VETERANS_LIST_ID,
} from "~/lib/constants/constants"
import {
  addSubscribersToListBulk,
  removeSubscribersFromListBulk,
} from "./listmonk-client.server"
import { getListSubscribers } from "./listmonk-lists.server"

export interface VeteransSyncResult {
  added: number
  removed: number
  total: number
}

export async function getConsentedVeteranEmails(): Promise<string[]> {
  const rows = await kyselyDb
    .selectFrom("profiles as p")
    .innerJoin("newsletter_subscriptions as ns", "ns.profile_id", "p.id")
    .select("p.email")
    .where("p.is_veteran", "=", true)
    .where("ns.consent_given", "=", true)
    .where("ns.sync_status", "<>", "unsubscribed")
    .execute()

  return rows.map((row) => row.email)
}

async function getActiveListSubscribers(listId: number) {
  const result = await getListSubscribers(listId)
  if (!result.success) {
    throw new Error(
      result.errors[0]?.message ?? `Failed to read Listmonk list ${listId}`,
    )
  }
  return result.data
}

export const syncVeteransListmonkList = composable(
  async (): Promise<VeteransSyncResult> => {
    const veteranEmails = new Set(
      (await getConsentedVeteranEmails()).map((email) =>
        email.trim().toLowerCase(),
      ),
    )

    const registered = await getActiveListSubscribers(
      LISTMONK_REGISTERED_LIST_ID,
    )
    const eligibleIds = new Set(
      registered
        .filter(
          (subscriber) =>
            subscriber.status !== "blocklisted" &&
            veteranEmails.has(subscriber.email.trim().toLowerCase()),
        )
        .map((subscriber) => subscriber.id),
    )

    const currentIds = new Set(
      (await getActiveListSubscribers(LISTMONK_VETERANS_LIST_ID)).map(
        (subscriber) => subscriber.id,
      ),
    )

    const toAdd = [...eligibleIds].filter((id) => !currentIds.has(id))
    const toRemove = [...currentIds].filter((id) => !eligibleIds.has(id))

    if (toAdd.length > 0) {
      const addResult = await addSubscribersToListBulk(
        toAdd,
        LISTMONK_VETERANS_LIST_ID,
      )
      if (!addResult.success) {
        throw new Error(
          addResult.errors[0]?.message ?? "Failed to add veterans to the list",
        )
      }
    }

    if (toRemove.length > 0) {
      const removeResult = await removeSubscribersFromListBulk(
        toRemove,
        LISTMONK_VETERANS_LIST_ID,
      )
      if (!removeResult.success) {
        throw new Error(
          removeResult.errors[0]?.message ??
            "Failed to remove veterans from the list",
        )
      }
    }

    return {
      added: toAdd.length,
      removed: toRemove.length,
      total: eligibleIds.size,
    }
  },
)

import type { Transaction } from "kysely"
import { adminAddParticipantsCopy } from "~/copy/admin/add-participants"
import { MANUALLY_ADDED_REFERRED } from "~/lib/constants/constants"
import { checkEventStatus } from "~/lib/helpers/check-event-status"
import { db } from "~/lib/supabase/db.server"
import type { Database as Schema } from "~/types/database/database.types"
import type { Database } from "~/types/database/kysely.types"
import { markInviteUsed } from "../event/event-invite.server"

type SpotType = Schema["public"]["Enums"]["spot_type"]

export type DirectAddition = { profileId: string; spotType: SpotType }

export type DirectAdditionOutcome =
  | "added"
  | "reactivated"
  | "already-registered"
  | "ineligible"

export class EventNotAcceptingAdditionsError extends Error {
  constructor() {
    super(adminAddParticipantsCopy.notAccepting)
  }
}

/**
 * Puts people on an event without an application. The row is written with
 * is_user_applied true, so a regular spot counts toward the registration
 * limit and the trigger closes registrations as it would for an application;
 * the admin is never stopped by the limit itself. No email is sent.
 */
export async function addParticipantsDirectly({
  eventId,
  people,
}: {
  eventId: string
  people: DirectAddition[]
}): Promise<{ profileId: string; outcome: DirectAdditionOutcome }[]> {
  return await db.transaction().execute(async (trx) => {
    const event = await trx
      .selectFrom("events")
      .select("event_status")
      .where("id", "=", eventId)
      .executeTakeFirst()

    if (!event || !checkEventStatus(event.event_status).acceptsDirectAdditions) {
      throw new EventNotAcceptingAdditionsError()
    }

    const outcomes: { profileId: string; outcome: DirectAdditionOutcome }[] = []
    for (const person of people) {
      outcomes.push({
        profileId: person.profileId,
        outcome: await addOne(trx, eventId, person),
      })
    }
    return outcomes
  })
}

async function addOne(
  trx: Transaction<Database>,
  eventId: string,
  { profileId, spotType }: DirectAddition,
): Promise<DirectAdditionOutcome> {
  const profile = await trx
    .selectFrom("profiles")
    .select(["basic_data_filled", "approved_to_attend"])
    .where("id", "=", profileId)
    .executeTakeFirst()

  if (
    !profile ||
    !profile.basic_data_filled ||
    profile.approved_to_attend === "rejected"
  ) {
    return "ineligible"
  }

  const existing = await trx
    .selectFrom("event_participants")
    .select(["id", "is_user_applied"])
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .forUpdate()
    .executeTakeFirst()

  if (existing?.is_user_applied) return "already-registered"

  const spot = {
    is_user_applied: true,
    spot_type: spotType,
    referred: MANUALLY_ADDED_REFERRED,
    application_date: new Date().toISOString(),
    cancellation_date: null,
    cancellation_reason: null,
  }

  if (existing) {
    await trx
      .updateTable("event_participants")
      .set(spot)
      .where("id", "=", existing.id)
      .execute()
  } else {
    // An application landing between the read and this insert holds the spot
    // already, and the unique index says so.
    const inserted = await trx
      .insertInto("event_participants")
      .values({ ...spot, event_id: eventId, profile_id: profileId })
      .onConflict((oc) => oc.columns(["event_id", "profile_id"]).doNothing())
      .returning("id")
      .executeTakeFirst()

    if (!inserted) return "already-registered"
  }

  await markInviteUsed(eventId, profileId, trx)

  return existing ? "reactivated" : "added"
}

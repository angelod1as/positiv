import type { Kysely, Transaction } from "kysely"
import { db } from "~/lib/supabase/db.server"
import type { Database } from "~/types/database/kysely.types"

type Executor = Kysely<Database> | Transaction<Database>

/**
 * An invite is valid while nobody revoked it. `used_at` is deliberately not
 * consulted: someone who applied, cancelled, and thought better of it opens the
 * same link again.
 */
export async function findValidInvite(
  eventId: string,
  profileId: string,
  trx?: Transaction<Database>,
) {
  // Inside a transaction the row is locked, so the transaction waits for a
  // revoke in flight and then reads it, rather than acting on the invite as it
  // was. Outside one a lock would be released at once and protect nothing.
  return await (trx ?? db)
    .selectFrom("event_invites")
    .selectAll()
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .where("revoked_at", "is", null)
    .$if(trx !== undefined, (qb) => qb.forUpdate())
    .executeTakeFirst()
}

export async function findValidInviteByToken(token: string) {
  return await db
    .selectFrom("event_invites")
    .selectAll()
    .where("token", "=", token)
    .where("revoked_at", "is", null)
    .executeTakeFirst()
}

export async function markInviteUsed(
  eventId: string,
  profileId: string,
  executor: Executor = db,
) {
  await executor
    .updateTable("event_invites")
    .set({ used_at: new Date().toISOString() })
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .where("revoked_at", "is", null)
    .execute()
}

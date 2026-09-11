import { kyselyDb } from "~/kysely-db"

/**
 * An invite is valid while nobody revoked it. `used_at` is deliberately not
 * consulted: someone who applied, cancelled, and thought better of it opens the
 * same link again.
 */
export async function findValidInvite(eventId: string, profileId: string) {
  return await kyselyDb
    .selectFrom("event_invites")
    .selectAll()
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .where("revoked_at", "is", null)
    .executeTakeFirst()
}

export async function findValidInviteByToken(token: string) {
  return await kyselyDb
    .selectFrom("event_invites")
    .selectAll()
    .where("token", "=", token)
    .where("revoked_at", "is", null)
    .executeTakeFirst()
}

export async function markInviteUsed(eventId: string, profileId: string) {
  await kyselyDb
    .updateTable("event_invites")
    .set({ used_at: new Date().toISOString() })
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .where("revoked_at", "is", null)
    .execute()
}

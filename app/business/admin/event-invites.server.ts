import { randomBytes } from "node:crypto"
import { kyselyDb } from "~/kysely-db"

const newToken = () => randomBytes(24).toString("base64url")

/**
 * One invite per (event, profile). Asking twice hands back the same link
 * rather than a rival the admin might send by mistake -- except after a
 * revocation, where the row is reused with a fresh token so the link that was
 * called off stays dead.
 */
export async function createInvite({
  eventId,
  profileId,
}: {
  eventId: string
  profileId: string
}) {
  const existing = await kyselyDb
    .selectFrom("event_invites")
    .selectAll()
    .where("event_id", "=", eventId)
    .where("profile_id", "=", profileId)
    .executeTakeFirst()

  if (existing && !existing.revoked_at) return existing

  if (existing) return await reissue(existing.id)

  // Two clicks close together both read no row and both insert. The unique
  // index is what settles it, and the loser reads back what the winner wrote
  // rather than surfacing a constraint violation as a 500.
  try {
    return await kyselyDb
      .insertInto("event_invites")
      .values({ event_id: eventId, profile_id: profileId, token: newToken() })
      .returningAll()
      .executeTakeFirstOrThrow()
  } catch (error) {
    if (!isUniqueViolation(error)) throw error

    const winner = await kyselyDb
      .selectFrom("event_invites")
      .selectAll()
      .where("event_id", "=", eventId)
      .where("profile_id", "=", profileId)
      .executeTakeFirstOrThrow()

    return winner.revoked_at ? await reissue(winner.id) : winner
  }
}

/** Postgres says 23505 when a unique index turns a write away. */
const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "23505"

const reissue = async (inviteId: string) =>
  await kyselyDb
    .updateTable("event_invites")
    .set({ token: newToken(), revoked_at: null, used_at: null })
    .where("id", "=", inviteId)
    .returningAll()
    .executeTakeFirstOrThrow()

/**
 * Scoped by event as well as by id. The endpoint asks for both, and an invite
 * revoked from the wrong event's page would be a silent mistake -- the caller
 * names the event it believes it is acting on, and that has to be true.
 */
export async function revokeInvite(eventId: string, inviteId: string) {
  await kyselyDb
    .updateTable("event_invites")
    .set({ revoked_at: new Date().toISOString() })
    .where("id", "=", inviteId)
    .where("event_id", "=", eventId)
    .execute()
}

export async function listInvitesForEvent(eventId: string) {
  return await kyselyDb
    .selectFrom("event_invites")
    .innerJoin("profiles", "profiles.id", "event_invites.profile_id")
    .select([
      "event_invites.id",
      "event_invites.event_id",
      "event_invites.profile_id",
      "event_invites.token",
      "event_invites.created_at",
      "event_invites.used_at",
      "event_invites.revoked_at",
      "profiles.full_name",
      "profiles.social_name",
    ])
    .where("event_invites.event_id", "=", eventId)
    .orderBy("event_invites.created_at", "desc")
    .execute()
}

export type EventInviteRow = Awaited<
  ReturnType<typeof listInvitesForEvent>
>[number]

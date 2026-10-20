import { createHash } from "node:crypto"
import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"

export type AuthAttemptScope =
  | "login_ip"
  | "login_email"
  | "reset_ip"
  | "reset_email"

const MINUTE_MS = 60 * 1000

export const AUTH_ATTEMPT_LIMITS = {
  login_ip: { limit: 30, windowMs: 15 * MINUTE_MS },
  login_email: { limit: 10, windowMs: 15 * MINUTE_MS },
  reset_ip: { limit: 10, windowMs: 60 * MINUTE_MS },
  reset_email: { limit: 3, windowMs: 60 * MINUTE_MS },
} as const satisfies Record<
  AuthAttemptScope,
  { limit: number; windowMs: number }
>

const LONGEST_WINDOW_MS = Math.max(
  ...Object.values(AUTH_ATTEMPT_LIMITS).map(({ windowMs }) => windowMs),
)

/**
 * Keys are compared trimmed and lowercased, so an e-mail typed with a capital
 * or a trailing space counts against the same address.
 */
export const hashAuthAttemptKey = (key: string) =>
  createHash("sha256").update(key.trim().toLowerCase()).digest("hex")

const windowStartFor = (scope: AuthAttemptScope, now: Date) =>
  new Date(now.getTime() - AUTH_ATTEMPT_LIMITS[scope].windowMs).toISOString()

const pruneExpired = (now: Date) =>
  kyselyDb
    .deleteFrom("auth_attempts")
    .where(
      "created_at",
      "<",
      new Date(now.getTime() - LONGEST_WINDOW_MS).toISOString(),
    )
    .execute()

/**
 * Counts an attempt against its key and answers with the row that holds its
 * turn, or null when the key is at its limit. A refused attempt is not
 * recorded, so a key gets its turns back as its oldest attempts leave the
 * window.
 */
export const reserveAuthAttempt = async (
  scope: AuthAttemptScope,
  key: string,
  now: Date = new Date(),
): Promise<number | null> => {
  const keyHash = hashAuthAttemptKey(key)
  const windowStart = windowStartFor(scope, now)

  await pruneExpired(now)

  // Attempts on one key queue behind each other, so a burst cannot all read a
  // count under the limit before any of them is recorded.
  return kyselyDb.transaction().execute(async (trx) => {
    await sql`SELECT pg_advisory_xact_lock(hashtext(${`${scope}:${keyHash}`}))`.execute(
      trx,
    )

    const { count } = await trx
      .selectFrom("auth_attempts")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("scope", "=", scope)
      .where("key_hash", "=", keyHash)
      .where("created_at", ">=", windowStart)
      .executeTakeFirstOrThrow()

    if (Number(count) >= AUTH_ATTEMPT_LIMITS[scope].limit) return null

    const { id } = await trx
      .insertInto("auth_attempts")
      .values({ scope, key_hash: keyHash, created_at: now.toISOString() })
      .returning("id")
      .executeTakeFirstOrThrow()

    // node-postgres hands a bigint back as a string.
    return Number(id)
  })
}

export const recordAuthAttempt = async (
  scope: AuthAttemptScope,
  key: string,
  now: Date = new Date(),
): Promise<boolean> => (await reserveAuthAttempt(scope, key, now)) !== null

/**
 * Hands a reserved turn back, for limits that count only the attempts that
 * went wrong. Reserving first and releasing after keeps a burst from all
 * getting through before any failure is counted.
 */
export const releaseAuthAttempt = async (id: number): Promise<void> => {
  await kyselyDb.deleteFrom("auth_attempts").where("id", "=", id).execute()
}

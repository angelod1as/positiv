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
 * Counts an attempt against its key and answers whether it may go ahead. A
 * refused attempt is not recorded, so a key gets its turns back as its oldest
 * attempts leave the window.
 */
export const recordAuthAttempt = async (
  scope: AuthAttemptScope,
  key: string,
  now: Date = new Date(),
): Promise<boolean> => {
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

    if (Number(count) >= AUTH_ATTEMPT_LIMITS[scope].limit) return false

    await trx
      .insertInto("auth_attempts")
      .values({ scope, key_hash: keyHash, created_at: now.toISOString() })
      .execute()

    return true
  })
}

/**
 * Whether a key is still under its limit, without counting this as an
 * attempt. Paired with recordAuthFailure for limits that count only what went
 * wrong.
 */
export const isAuthAttemptAllowed = async (
  scope: AuthAttemptScope,
  key: string,
  now: Date = new Date(),
): Promise<boolean> => {
  const { count } = await kyselyDb
    .selectFrom("auth_attempts")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .where("scope", "=", scope)
    .where("key_hash", "=", hashAuthAttemptKey(key))
    .where("created_at", ">=", windowStartFor(scope, now))
    .executeTakeFirstOrThrow()

  return Number(count) < AUTH_ATTEMPT_LIMITS[scope].limit
}

export const recordAuthFailure = async (
  scope: AuthAttemptScope,
  key: string,
  now: Date = new Date(),
): Promise<void> => {
  await pruneExpired(now)

  await kyselyDb
    .insertInto("auth_attempts")
    .values({
      scope,
      key_hash: hashAuthAttemptKey(key),
      created_at: now.toISOString(),
    })
    .execute()
}

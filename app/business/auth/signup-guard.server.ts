import { createHash } from "node:crypto"
import { sql } from "kysely"
import { kyselyDb } from "~/kysely-db"

export const SIGNUP_ATTEMPT_LIMIT = 10
export const SIGNUP_ATTEMPT_WINDOW_MS = 24 * 60 * 60 * 1000

export const hashSignupIp = (ip: string) =>
  createHash("sha256").update(ip).digest("hex")

/**
 * Counts a signup attempt against the address it came from and answers
 * whether it may go ahead. A refused attempt is not recorded, so an address
 * gets its turns back as its oldest attempts leave the window.
 */
export const recordSignupAttempt = async (
  ip: string,
  now: Date = new Date(),
): Promise<boolean> => {
  const ipHash = hashSignupIp(ip)
  const windowStart = new Date(
    now.getTime() - SIGNUP_ATTEMPT_WINDOW_MS,
  ).toISOString()

  await kyselyDb
    .deleteFrom("signup_attempts")
    .where("created_at", "<", windowStart)
    .execute()

  // Attempts from one address queue behind each other, so a burst cannot all
  // read a count under the limit before any of them is recorded.
  return kyselyDb.transaction().execute(async (trx) => {
    await sql`SELECT pg_advisory_xact_lock(hashtext(${ipHash}))`.execute(trx)

    const { count } = await trx
      .selectFrom("signup_attempts")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("ip_hash", "=", ipHash)
      .where("created_at", ">=", windowStart)
      .executeTakeFirstOrThrow()

    if (Number(count) >= SIGNUP_ATTEMPT_LIMIT) return false

    await trx
      .insertInto("signup_attempts")
      .values({ ip_hash: ipHash, created_at: now.toISOString() })
      .execute()

    return true
  })
}

export const isSignupDomainBlocked = async (
  email: string,
): Promise<boolean> => {
  const domain = email.trim().toLowerCase().split("@").at(-1)
  if (!domain) return false

  const blocked = await kyselyDb
    .selectFrom("blocked_signup_domains")
    .select("domain")
    .where("domain", "=", domain)
    .executeTakeFirst()

  return Boolean(blocked)
}

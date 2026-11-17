import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Pool } from "pg"
import type { PoolClient } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { assertLocalDatabaseUrl } from "~/test/assert-local-database"

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261117120000_email_consents.sql"),
  "utf8",
)

type ConsentRow = {
  registration_alerts: boolean
  registration_alerts_at: Date | null
  newsletter: boolean
  newsletter_at: Date | null
  marketing: boolean
  marketing_at: Date | null
  access_token: string
}

/**
 * The migration runs against a database that already holds consent, so the
 * test builds that state, drops the table and runs the migration file itself
 * inside a transaction that is rolled back: nothing it writes survives.
 */
describe("email_consents migration - Integration Tests", () => {
  const pool = new Pool({
    connectionString: assertLocalDatabaseUrl(process.env.SUPABASE_CONNECT_URL),
  })
  let client: PoolClient

  const consentedAt = new Date("2026-03-01T12:00:00.000Z")
  const withdrawnAt = new Date("2026-06-01T12:00:00.000Z")
  const ids = { consented: "", withdrew: "", neverAsked: "" }

  const insertProfile = async (email: string) => {
    const result = await client.query<{ id: string }>(
      "INSERT INTO public.profiles (email) VALUES ($1) RETURNING id",
      [email],
    )
    return result.rows[0].id
  }

  const consentOf = async (profileId: string) => {
    const result = await client.query<ConsentRow>(
      "SELECT * FROM public.email_consents WHERE profile_id = $1",
      [profileId],
    )
    expect(result.rows).toHaveLength(1)
    return result.rows[0]
  }

  beforeAll(async () => {
    client = await pool.connect()
    await client.query("BEGIN")

    ids.consented = await insertProfile("web51-consented@example.com")
    ids.withdrew = await insertProfile("web51-withdrew@example.com")
    ids.neverAsked = await insertProfile("web51-never-asked@example.com")

    await client.query(
      `INSERT INTO public.newsletter_subscriptions
         (profile_id, consent_given, first_consent_given_at, last_consent_given_at, subscribed_at, sync_status)
       VALUES ($1, true, $2, $2, $2, 'synced')`,
      [ids.consented, consentedAt],
    )
    await client.query(
      `INSERT INTO public.newsletter_subscriptions
         (profile_id, consent_given, first_consent_given_at, last_consent_given_at, unsubscribed_at, sync_status)
       VALUES ($1, false, $2, $2, $3, 'unsubscribed')`,
      [ids.withdrew, consentedAt, withdrawnAt],
    )

    await client.query("DROP TABLE IF EXISTS public.email_consents CASCADE")
    await client.query(MIGRATION)
  })

  afterAll(async () => {
    await client.query("ROLLBACK")
    client.release()
    await pool.end()
  })

  it("should give every profile exactly one row", async () => {
    const result = await client.query<{ profiles: string; consents: string }>(
      `SELECT (SELECT count(*) FROM public.profiles) AS profiles,
              (SELECT count(*) FROM public.email_consents) AS consents`,
    )

    expect(result.rows[0].consents).toBe(result.rows[0].profiles)
  })

  it("should carry a yes into Newsletter and Marketing and keep Registration alerts on", async () => {
    const consent = await consentOf(ids.consented)

    expect(consent).toMatchObject({
      newsletter: true,
      newsletter_at: consentedAt,
      marketing: true,
      marketing_at: consentedAt,
      registration_alerts: true,
      registration_alerts_at: null,
    })
  })

  it("should carry a withdrawal into every category, dated when it happened", async () => {
    const consent = await consentOf(ids.withdrew)

    expect(consent).toMatchObject({
      newsletter: false,
      newsletter_at: withdrawnAt,
      marketing: false,
      marketing_at: withdrawnAt,
      registration_alerts: false,
      registration_alerts_at: withdrawnAt,
    })
  })

  it("should leave a profile with no record off for Newsletter and Marketing, on for alerts, never asked", async () => {
    const consent = await consentOf(ids.neverAsked)

    expect(consent).toMatchObject({
      newsletter: false,
      newsletter_at: null,
      marketing: false,
      marketing_at: null,
      registration_alerts: true,
      registration_alerts_at: null,
    })
  })

  it("should give every profile its own access token", async () => {
    const result = await client.query<{ tokens: string; distinct_tokens: string }>(
      `SELECT count(access_token) AS tokens,
              count(DISTINCT access_token) AS distinct_tokens
         FROM public.email_consents`,
    )

    expect(result.rows[0].distinct_tokens).toBe(result.rows[0].tokens)
    expect(Number(result.rows[0].tokens)).toBeGreaterThan(0)
  })
})

/**
 * db push applies each migration in its own transaction while the previous
 * app keeps serving, so a profile created between the backfill and the
 * profiles trigger has no row. The last migration runs the backfill again
 * once both triggers exist, and the next one carries a Newsletter answer
 * written before the mirror did.
 */
describe("email_consents backfill after the triggers - Integration Tests", () => {
  const pool = new Pool({
    connectionString: assertLocalDatabaseUrl(process.env.SUPABASE_CONNECT_URL),
  })
  let client: PoolClient
  let profileId = ""
  let unmirroredId = ""
  let earlyNoId = ""
  const withdrawnAt = new Date("2026-06-01T12:00:00.000Z")
  const consentedAt = new Date("2026-03-01T12:00:00.000Z")

  beforeAll(async () => {
    client = await pool.connect()
    await client.query("BEGIN")

    const profile = await client.query<{ id: string }>(
      "INSERT INTO public.profiles (email) VALUES ('web51-gap@example.com') RETURNING id",
    )
    profileId = profile.rows[0].id
    await client.query(
      `INSERT INTO public.newsletter_subscriptions
         (profile_id, consent_given, unsubscribed_at, sync_status)
       VALUES ($1, false, $2, 'unsubscribed')`,
      [profileId, withdrawnAt],
    )
    await client.query(
      "DELETE FROM public.email_consents WHERE profile_id = $1",
      [profileId],
    )

    await client.query(
      "ALTER TABLE public.newsletter_subscriptions DISABLE TRIGGER mirror_newsletter_consent",
    )
    const unmirrored = await client.query<{ id: string }>(
      "INSERT INTO public.profiles (email) VALUES ('web51-unmirrored@example.com') RETURNING id",
    )
    unmirroredId = unmirrored.rows[0].id
    await client.query(
      `INSERT INTO public.newsletter_subscriptions
         (profile_id, consent_given, last_consent_given_at, sync_status)
       VALUES ($1, true, $2, 'synced')`,
      [unmirroredId, consentedAt],
    )
    const earlyNo = await client.query<{ id: string }>(
      "INSERT INTO public.profiles (email) VALUES ('web51-early-no@example.com') RETURNING id",
    )
    earlyNoId = earlyNo.rows[0].id
    await client.query(
      `UPDATE public.email_consents
          SET newsletter = false, newsletter_at = $2
        WHERE profile_id = $1`,
      [earlyNoId, withdrawnAt],
    )
    await client.query(
      `INSERT INTO public.newsletter_subscriptions
         (profile_id, consent_given, unsubscribed_at, sync_status)
       VALUES ($1, false, $2, 'unsubscribed')`,
      [earlyNoId, withdrawnAt],
    )
    await client.query(
      "ALTER TABLE public.newsletter_subscriptions ENABLE TRIGGER mirror_newsletter_consent",
    )

    for (const migration of [
      "20261117120300_backfill_email_consents_after_triggers.sql",
      "20261117120400_mirror_newsletter_consent_written_before_trigger.sql",
      "20261117120600_turn_alerts_off_for_no_written_before_trigger.sql",
    ]) {
      await client.query(
        readFileSync(join(process.cwd(), "supabase/migrations", migration), "utf8"),
      )
    }
  })

  afterAll(async () => {
    await client.query("ROLLBACK")
    client.release()
    await pool.end()
  })

  it("should give a profile created in the gap its row, carrying its consent", async () => {
    const result = await client.query<ConsentRow>(
      "SELECT * FROM public.email_consents WHERE profile_id = $1",
      [profileId],
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      newsletter: false,
      newsletter_at: withdrawnAt,
      marketing: false,
      marketing_at: withdrawnAt,
      registration_alerts: false,
      registration_alerts_at: withdrawnAt,
    })
  })

  it("should carry a Newsletter answer written before the mirror existed", async () => {
    const result = await client.query<ConsentRow>(
      "SELECT * FROM public.email_consents WHERE profile_id = $1",
      [unmirroredId],
    )

    expect(result.rows[0]).toMatchObject({
      newsletter: true,
      newsletter_at: consentedAt,
      registration_alerts: true,
      marketing: false,
    })
  })

  it("should turn alerts off for a no the mirror carried before it did so", async () => {
    const result = await client.query<ConsentRow>(
      "SELECT * FROM public.email_consents WHERE profile_id = $1",
      [earlyNoId],
    )

    expect(result.rows[0]).toMatchObject({
      newsletter: false,
      newsletter_at: withdrawnAt,
      registration_alerts: false,
      registration_alerts_at: withdrawnAt,
      marketing: false,
      marketing_at: null,
    })
  })
})

import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"
import type { userContextSchema } from "../auth/auth-schemas"
import {
  createTestEvent,
  createTestEventInvite,
  createTestProfile,
} from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { applyToEvent } from "./apply-to-event.server"

vi.mock("./send-application-mail.server", () => ({
  sendApplicationMail: vi.fn().mockResolvedValue({ emailSent: false }),
}))

// The application goes through Kysely alone. A session client that throws on
// use proves it, and keeps the service_role -- which would mask any missing
// check -- out of these tests.
const noSupabase = new Proxy(
  {},
  {
    get() {
      throw new Error("applyToEvent must not reach supabase-js")
    },
  },
)

describe("applying to a closed event with an invite", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let eventId: string
  let profileId: string
  let profileEmail: string

  const answers = () => ({
    eventId,
    applicationDate: new Date(),
    referred: "Administração",
    bond: "Posso ir sozinhe." as const,
  })

  const context = () =>
    ({
      supabase: noSupabase,
      supabaseHeaders: new Headers(),
      currentUser: { id: profileId, email: profileEmail },
      currentProfile: {
        id: profileId,
        email: profileEmail,
        full_name: "Invited Person",
        basic_data_filled: true,
        created_at: new Date().toISOString(),
      },
      isProdInDev: false,
      host: "localhost",
    }) as unknown as z.infer<typeof userContextSchema>

  beforeEach(async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Closed event",
      event_status: "Registration Closed",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    eventId = event.id

    profileEmail = `invited-${randomUUID()}@test.com`
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: profileEmail,
      full_name: "Invited Person",
    })
    profileId = profile.id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("refuses an application when the event is closed and there is no invite", async () => {
    const result = await applyToEvent(answers(), context())

    expect(result.success).toBe(false)
  })

  it("accepts the application when a valid invite exists", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    const result = await applyToEvent(answers(), context())

    expect(result.success).toBe(true)
  })

  it("refuses when the invite was revoked", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
      revoked_at: new Date().toISOString(),
    })

    const result = await applyToEvent(answers(), context())

    expect(result.success).toBe(false)
  })

  it("stamps the invite as used once the application is in", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    await applyToEvent(answers(), context())

    const invite = await kysely
      .selectFrom("event_invites")
      .selectAll()
      .where("event_id", "=", eventId)
      .where("profile_id", "=", profileId)
      .executeTakeFirstOrThrow()

    expect(invite.used_at).not.toBeNull()
  })

  it("writes the application for the signed-in profile, whatever the body names", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })
    const victim = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `victim-${randomUUID()}@test.com`,
    })

    const result = await applyToEvent(
      { ...answers(), profile_id: victim.id } as ReturnType<typeof answers>,
      context(),
    )

    expect(result.success).toBe(true)
    const rows = await kysely
      .selectFrom("event_participants")
      .select(["id", "profile_id"])
      .where("event_id", "=", eventId)
      .execute()
    rows.forEach((row) => tracker.track("event_participants", row.id))
    expect(rows.map((row) => row.profile_id)).toEqual([profileId])
  })

  // The admin's revoke holds the invite row while the application is on its
  // way in. Read, write and stamp share one transaction that locks the invite,
  // so the application waits for the revoke and then sees it.
  it("refuses an application racing an admin who revokes the invite", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    const applications: ReturnType<typeof applyToEvent>[] = []
    await kysely.transaction().execute(async (trx) => {
      await trx
        .updateTable("event_invites")
        .set({ revoked_at: new Date().toISOString() })
        .where("event_id", "=", eventId)
        .where("profile_id", "=", profileId)
        .execute()

      applications.push(applyToEvent(answers(), context()))
      await new Promise((resolve) => setTimeout(resolve, 300))
    })

    const [result] = await Promise.all(applications)

    expect(result.success).toBe(false)
    const rows = await kysely
      .selectFrom("event_participants")
      .select("id")
      .where("event_id", "=", eventId)
      .execute()
    rows.forEach((row) => tracker.track("event_participants", row.id))
    expect(rows).toHaveLength(0)
  })
})

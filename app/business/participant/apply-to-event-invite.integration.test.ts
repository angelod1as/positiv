import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"
import type { userContextSchema } from "../common"
import {
  createTestEvent,
  createTestEventInvite,
  createTestProfile,
  getTestSupabaseClient,
} from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { applyToEvent } from "./apply-to-event.server"

vi.mock("./send-application-mail.server", () => ({
  sendApplicationMail: vi.fn().mockResolvedValue({ emailSent: false }),
}))

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
      supabase: getTestSupabaseClient(),
      supabaseHeaders: new Headers(),
      currentUser: { id: profileId, email: profileEmail },
      currentProfile: {
        id: profileId,
        email: profileEmail,
        full_name: "Invited Person",
        basic_data_filled: true,
        created_at: new Date().toISOString(),
        is_admin: false,
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
})

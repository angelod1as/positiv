import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createTestEvent, createTestProfile } from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createInvite,
  listInvitesForEvent,
  revokeInvite,
} from "./event-invites.server"

describe("event invites, from the admin's side", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let eventId: string
  let profileId: string

  beforeEach(async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Invite admin test event",
      event_status: "Registration Closed",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    eventId = event.id

    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `guest-${randomUUID()}@test.com`,
      full_name: "Guest Person",
    })
    profileId = profile.id
  })

  afterEach(async () => {
    // The rows here were made by the function under test, so the tracker never
    // saw them.
    await kysely
      .deleteFrom("event_invites")
      .where("event_id", "=", eventId)
      .execute()
    await cleanupAfterTest(tracker, kysely)
  })

  it("creates an invite with a token", async () => {
    const invite = await createInvite({ eventId, profileId })

    expect(invite.token).toEqual(expect.any(String))
    expect(invite.token.length).toBeGreaterThanOrEqual(20)
    expect(invite.event_id).toBe(eventId)
    expect(invite.profile_id).toBe(profileId)
  })

  it("returns the existing invite instead of minting a rival", async () => {
    const first = await createInvite({ eventId, profileId })
    const second = await createInvite({ eventId, profileId })

    expect(second.id).toBe(first.id)
    expect(second.token).toBe(first.token)
  })

  it("brings a revoked invite back to life rather than colliding with it", async () => {
    const first = await createInvite({ eventId, profileId })
    await revokeInvite(first.id)

    const second = await createInvite({ eventId, profileId })

    expect(second.id).toBe(first.id)
    expect(second.revoked_at).toBeNull()
    expect(second.token).not.toBe(first.token)
  })

  it("revokes an invite", async () => {
    const invite = await createInvite({ eventId, profileId })

    await revokeInvite(invite.id)

    const [listed] = await listInvitesForEvent(eventId)
    expect(listed.revoked_at).not.toBeNull()
  })

  it("lists the event's invites with the invited person's name", async () => {
    await createInvite({ eventId, profileId })

    const invites = await listInvitesForEvent(eventId)

    expect(invites).toHaveLength(1)
    expect(invites[0]).toMatchObject({
      profile_id: profileId,
      full_name: "Guest Person",
    })
  })
})

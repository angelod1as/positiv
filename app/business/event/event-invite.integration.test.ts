import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  createTestEvent,
  createTestEventInvite,
  createTestProfile,
} from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  findValidInvite,
  findValidInviteByToken,
  markInviteUsed,
} from "./event-invite.server"

describe("event invites, from the participant's side", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let eventId: string
  let profileId: string
  let otherProfileId: string

  beforeEach(async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Invite test event",
      event_status: "Registration Closed",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    eventId = event.id

    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `invited-${randomUUID()}@test.com`,
      full_name: "Invited Person",
    })
    profileId = profile.id

    const other = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `other-${randomUUID()}@test.com`,
      full_name: "Other Person",
    })
    otherProfileId = other.id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("finds an invite for the profile it belongs to", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    const invite = await findValidInvite(eventId, profileId)

    expect(invite?.profile_id).toBe(profileId)
  })

  it("finds nothing for a profile that was not invited", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    const invite = await findValidInvite(eventId, otherProfileId)

    expect(invite).toBeUndefined()
  })

  it("finds nothing once the invite is revoked", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
      revoked_at: new Date().toISOString(),
    })

    const invite = await findValidInvite(eventId, profileId)

    expect(invite).toBeUndefined()
  })

  it("keeps finding an invite that has already been used", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
      used_at: new Date().toISOString(),
    })

    const invite = await findValidInvite(eventId, profileId)

    expect(invite?.profile_id).toBe(profileId)
  })

  it("finds an invite by its token", async () => {
    const token = `tok-${randomUUID()}`
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token,
    })

    const invite = await findValidInviteByToken(token)

    expect(invite).toMatchObject({ event_id: eventId, profile_id: profileId })
  })

  it("finds nothing for an unknown token", async () => {
    const invite = await findValidInviteByToken(`tok-${randomUUID()}`)

    expect(invite).toBeUndefined()
  })

  it("stamps used_at once the application is in", async () => {
    await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      token: `tok-${randomUUID()}`,
    })

    await markInviteUsed(eventId, profileId)

    const invite = await findValidInvite(eventId, profileId)
    expect(invite?.used_at).not.toBeNull()
  })
})

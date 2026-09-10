import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import { searchProfilesForInvite } from "./search-profiles.server"

describe("searching for someone to invite", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let eventId: string
  let marker: string
  let phone: number

  beforeEach(async () => {
    marker = randomUUID().slice(0, 8)
    // The local database is shared with whatever else is running against it,
    // and a round number like 11987654321 is everybody's fixture. Five results
    // is the cap, so the seeded row has to be findable on its own digits.
    phone = 11900000000 + Math.floor(Math.random() * 99999999)

    const event = await createTestEvent(tracker, kysely, {
      title: "Search test event",
      event_status: "Registration Closed",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    eventId = event.id

    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `joao-${marker}@test.com`,
      full_name: `João Gonçalves ${marker}`,
      social_name: `Joana ${marker}`,
      phone,
    })
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("matches a full name", async () => {
    const results = await searchProfilesForInvite(eventId, `Gonçalves ${marker}`)

    expect(results).toHaveLength(1)
  })

  it("matches a name typed without its accents", async () => {
    const results = await searchProfilesForInvite(eventId, `Goncalves ${marker}`)

    expect(results).toHaveLength(1)
  })

  it("matches a social name", async () => {
    const results = await searchProfilesForInvite(eventId, `Joana ${marker}`)

    expect(results).toHaveLength(1)
  })

  it("matches an email", async () => {
    const results = await searchProfilesForInvite(
      eventId,
      `joao-${marker}@test.com`,
    )

    expect(results).toHaveLength(1)
  })

  it("matches a phone typed with punctuation", async () => {
    const text = String(phone)
    const typed = `(${text.slice(0, 2)}) ${text.slice(2, 7)}-${text.slice(7)}`

    const results = await searchProfilesForInvite(eventId, typed)

    // pg hands a bigint back as a string, whatever the generated type says.
    expect(results.some((row) => String(row.phone) === String(phone))).toBe(
      true,
    )
  })

  it("says who is already registered for the event", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `already-${marker}@test.com`,
      full_name: `Already In ${marker}`,
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: eventId,
      is_user_applied: true,
    })

    const results = await searchProfilesForInvite(
      eventId,
      `Already In ${marker}`,
    )

    expect(results[0].is_participant).toBe(true)
  })

  it("returns at most five rows", async () => {
    for (let index = 0; index < 7; index += 1) {
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `many-${index}-${marker}@test.com`,
        full_name: `Many People ${marker} ${index}`,
      })
    }

    const results = await searchProfilesForInvite(
      eventId,
      `Many People ${marker}`,
    )

    expect(results).toHaveLength(5)
  })

  it("returns nothing for a blank term", async () => {
    const results = await searchProfilesForInvite(eventId, "   ")

    expect(results).toEqual([])
  })
})

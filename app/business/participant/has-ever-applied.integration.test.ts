import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"
import { hasEverApplied } from "./has-ever-applied.server"

describe("hasEverApplied", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("returns false for a profile that never applied to anything", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: "Never Applied",
      email: `never-applied-${Date.now()}@example.com`,
    })

    expect(await hasEverApplied(profile.id)).toBe(false)
  })

  it("returns true for a profile with an active application", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: "Applied",
      email: `applied-${Date.now()}@example.com`,
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Evento com candidatura",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
    })

    expect(await hasEverApplied(profile.id)).toBe(true)
  })

  it("returns true after the person cancelled their only application", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: "Cancelled",
      email: `cancelled-${Date.now()}@example.com`,
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Evento cancelado",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: false,
      cancellation_date: new Date().toISOString(),
    })

    expect(await hasEverApplied(profile.id)).toBe(true)
  })

  it("returns false when the only application belongs to someone else", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: "Bystander",
      email: `bystander-${Date.now()}@example.com`,
    })
    const other = await createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: "Other Person",
      email: `other-${Date.now()}@example.com`,
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Evento de outra pessoa",
      event_status: "Registration Open",
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: other.id,
      event_id: event.id,
      is_user_applied: true,
    })

    expect(await hasEverApplied(profile.id)).toBe(false)
  })
})

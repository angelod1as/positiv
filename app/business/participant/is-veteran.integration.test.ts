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
import { isVeteran } from "./is-veteran.server"

describe("isVeteran", () => {
  const { tracker, kysely } = setupIntegrationTest()

  const aProfile = (label: string) =>
    createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: label,
      email: `${label}-${Date.now()}-${Math.random()}@example.com`,
    })

  const anEvent = (title: string, status = "Completed" as const) =>
    createTestEvent(tracker, kysely, {
      title,
      event_status: status,
      time_event_start: new Date(Date.now() - 86400000).toISOString(),
    })

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("is false for someone who never went to an event", async () => {
    const profile = await aProfile("newcomer")
    const event = await anEvent("Evento de hoje", "Registration Open")

    expect(await isVeteran(profile.id, event.id)).toBe(false)
  })

  it("is true for someone who attended a finalised application", async () => {
    const profile = await aProfile("veteran")
    const past = await anEvent("Evento passado")
    const current = await anEvent("Evento de hoje", "Registration Open")

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: past.id,
      attendance_status: "attended",
      application_status: "finalised",
    })

    expect(await isVeteran(profile.id, current.id)).toBe(true)
  })

  it("is false when the person applied but never attended", async () => {
    const profile = await aProfile("applied-only")
    const past = await anEvent("Evento passado")
    const current = await anEvent("Evento de hoje", "Registration Open")

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: past.id,
      attendance_status: "not-attended",
      application_status: "finalised",
    })

    expect(await isVeteran(profile.id, current.id)).toBe(false)
  })

  it("is false when the application never reached finalised", async () => {
    const profile = await aProfile("unfinalised")
    const past = await anEvent("Evento passado")
    const current = await anEvent("Evento de hoje", "Registration Open")

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: past.id,
      attendance_status: "attended",
      application_status: "talking",
    })

    expect(await isVeteran(profile.id, current.id)).toBe(false)
  })

  it("is false when the attended event was cancelled", async () => {
    const profile = await aProfile("cancelled-event")
    const past = await anEvent("Evento cancelado", "Cancelled")
    const current = await anEvent("Evento de hoje", "Registration Open")

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: past.id,
      attendance_status: "attended",
      application_status: "finalised",
    })

    expect(await isVeteran(profile.id, current.id)).toBe(false)
  })

  it("does not count the event being applied to", async () => {
    const profile = await aProfile("same-event")
    const current = await anEvent("Evento de hoje", "Registration Open")

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: current.id,
      attendance_status: "attended",
      application_status: "finalised",
    })

    expect(await isVeteran(profile.id, current.id)).toBe(false)
  })

  it("does not count someone else's attendance", async () => {
    const profile = await aProfile("bystander")
    const other = await aProfile("the-real-veteran")
    const past = await anEvent("Evento passado")
    const current = await anEvent("Evento de hoje", "Registration Open")

    await createTestEventParticipant(tracker, kysely, {
      profile_id: other.id,
      event_id: past.id,
      attendance_status: "attended",
      application_status: "finalised",
    })

    expect(await isVeteran(profile.id, current.id)).toBe(false)
  })
})

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

  const aProfile = (label: string, data: Record<string, unknown> = {}) =>
    createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: label,
      email: `${label}-${Date.now()}-${Math.random()}@example.com`,
      ...data,
    })

  const anEvent = () =>
    createTestEvent(tracker, kysely, {
      title: "Evento passado",
      event_status: "Completed",
      time_event_start: new Date(Date.now() - 86400000).toISOString(),
    })

  const setVeteranByHand = (profileId: string, value: boolean) =>
    kysely
      .updateTable("profiles")
      .set({ is_veteran: value })
      .where("id", "=", profileId)
      .execute()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("is false for someone who never went to an event", async () => {
    const profile = await aProfile("newcomer")

    expect(await isVeteran(profile.id)).toBe(false)
  })

  it("is false for a profile that does not exist", async () => {
    expect(await isVeteran(crypto.randomUUID())).toBe(false)
  })

  it("is true for someone who attended an event", async () => {
    const profile = await aProfile("veteran")
    const past = await anEvent()

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: past.id,
      attendance_status: "attended",
    })

    expect(await isVeteran(profile.id)).toBe(true)
  })

  it("is true for someone an admin marked as veteran by hand", async () => {
    const profile = await aProfile("marked-by-hand")

    await setVeteranByHand(profile.id, true)

    expect(await isVeteran(profile.id)).toBe(true)
  })

  it("is false for someone an admin unmarked, even after attending", async () => {
    const profile = await aProfile("unmarked-by-hand")
    const past = await anEvent()

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: past.id,
      attendance_status: "attended",
    })
    await setVeteranByHand(profile.id, false)

    expect(await isVeteran(profile.id)).toBe(false)
  })

  it("does not count someone else's veteran status", async () => {
    const profile = await aProfile("bystander")
    await aProfile("the-real-veteran", { is_veteran: true })

    expect(await isVeteran(profile.id)).toBe(false)
  })
})

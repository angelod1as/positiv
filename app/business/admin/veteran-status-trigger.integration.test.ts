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

describe("veteran status triggers (POS-636)", () => {
  const { tracker, kysely } = setupIntegrationTest()

  const eventStart = new Date("2026-01-10T22:00:00.000Z")

  const aProfile = (label: string, data: Record<string, unknown> = {}) =>
    createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: label,
      email: `test-veteran-trigger-${label}-${Date.now()}-${Math.random()}@example.com`,
      ...data,
    })

  const anEvent = () =>
    createTestEvent(tracker, kysely, {
      title: "Evento passado",
      event_status: "Completed",
      time_event_start: eventStart.toISOString(),
    })

  const veteranStatusOf = (profileId: string) =>
    kysely
      .selectFrom("profiles")
      .select(["is_veteran", "became_veteran_date"])
      .where("id", "=", profileId)
      .executeTakeFirstOrThrow()

  const setVeteranByHand = (profileId: string, isVeteran: boolean) =>
    kysely
      .updateTable("profiles")
      .set({ is_veteran: isVeteran })
      .where("id", "=", profileId)
      .execute()

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("makes someone a veteran from the start of the event they attended", async () => {
    const profile = await aProfile("attended")
    const event = await anEvent()

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      attendance_status: "attended",
    })

    const status = await veteranStatusOf(profile.id)
    expect(status.is_veteran).toBe(true)
    expect(new Date(status.became_veteran_date ?? "")).toEqual(eventStart)
  })

  it("makes someone a veteran when their attendance changes to attended", async () => {
    const profile = await aProfile("checked-in")
    const event = await anEvent()
    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      attendance_status: "pending",
    })

    expect((await veteranStatusOf(profile.id)).is_veteran).toBe(false)

    await kysely
      .updateTable("event_participants")
      .set({ attendance_status: "attended" })
      .where("id", "=", participant.id)
      .execute()

    expect((await veteranStatusOf(profile.id)).is_veteran).toBe(true)
  })

  it("keeps an admin's unmarking when the attended row is edited again", async () => {
    const profile = await aProfile("unmarked")
    const event = await anEvent()
    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      attendance_status: "attended",
    })

    await setVeteranByHand(profile.id, false)
    await kysely
      .updateTable("event_participants")
      .set({ notes: "Chegou cedo" })
      .where("id", "=", participant.id)
      .execute()

    expect(await veteranStatusOf(profile.id)).toEqual({
      is_veteran: false,
      became_veteran_date: null,
    })
  })

  it("dates a veteran marked by hand from the moment of marking", async () => {
    const profile = await aProfile("marked")
    const before = Date.now()

    await setVeteranByHand(profile.id, true)

    const status = await veteranStatusOf(profile.id)
    expect(status.is_veteran).toBe(true)
    expect(new Date(status.became_veteran_date ?? "").getTime()).toBeGreaterThanOrEqual(
      before - 60_000,
    )
  })

  it("clears the date when an admin unmarks a veteran", async () => {
    const profile = await aProfile("cleared", {
      is_veteran: true,
      became_veteran_date: eventStart.toISOString(),
    })

    await setVeteranByHand(profile.id, false)

    expect(await veteranStatusOf(profile.id)).toEqual({
      is_veteran: false,
      became_veteran_date: null,
    })
  })

  it("keeps the existing date when a veteran is marked again", async () => {
    const profile = await aProfile("remarked", {
      is_veteran: true,
      became_veteran_date: eventStart.toISOString(),
    })

    await setVeteranByHand(profile.id, true)

    const status = await veteranStatusOf(profile.id)
    expect(new Date(status.became_veteran_date ?? "")).toEqual(eventStart)
  })
})

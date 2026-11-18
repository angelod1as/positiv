import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"
import type { EventStatus } from "~types/database/entities.types"
import type { DatavizRange } from "./dataviz-range"
import { getTimingData } from "./event-metrics.server"
import { getPartySummary } from "./party-summary.server"

describe("getPartySummary", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const testPrefix = `party-summary-${Date.now()}`

  beforeEach(async () => {
    tracker.clear()
    await kysely.deleteFrom("payments").execute()
    await kysely.deleteFrom("event_participants").execute()
    await kysely
      .updateTable("events")
      .set({ event_status: "Draft" })
      .where("event_status", "=", "Completed")
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const range: DatavizRange = {
    from: "2025-09-01T00:00:00.000Z",
    to: "2025-12-31T23:59:59.000Z",
  }

  const party = (title: string, date: string) =>
    createTestEvent(tracker, kysely, {
      title,
      event_status: "Completed" as EventStatus,
      time_event_start: date,
    })

  const person = (name: string, dateOfBirth: string | null = null) =>
    createTestProfile(tracker, kysely, {
      user_id: null,
      email: `${testPrefix}-${name}@test.com`,
      date_of_birth: dateOfBirth,
    })

  const join = (
    eventId: string,
    profileId: string,
    attendance: "attended" | "not-selected" | "not-attended" = "attended",
    spotType: "regular" | "social" | "staff" = "regular"
  ) =>
    createTestEventParticipant(tracker, kysely, {
      event_id: eventId,
      profile_id: profileId,
      attendance_status: attendance,
      spot_type: spotType,
    })

  it("sums up the parties in the range the way the annual report does", async () => {
    const before = await party("August", "2025-08-16T22:00:00.000Z")
    const september = await party("September", "2025-09-20T22:00:00.000Z")
    const october = await party("October", "2025-10-18T22:00:00.000Z")
    const january = await party("January", "2026-01-17T22:00:00.000Z")

    const veteran = await person("veteran", "1990-01-01")
    const regular = await person("regular", "2000-12-01")
    const oneOff = await person("one-off", "1970-06-01")
    const comesBackLater = await person("comes-back-later")
    const notSelected = await person("not-selected")
    const staff = await person("staff")

    await join(before.id, veteran.id)
    await join(september.id, veteran.id)
    await join(september.id, regular.id)
    await join(october.id, regular.id, "attended", "social")
    await join(october.id, oneOff.id)
    await join(october.id, comesBackLater.id)
    await join(january.id, comesBackLater.id)
    await join(october.id, notSelected.id, "not-selected")
    await join(october.id, staff.id, "attended", "staff")

    const summary = await getPartySummary(range)

    expect(summary).toEqual({
      parties: 2,
      people: 5,
      attendances: 6,
      applications: 6,
      acceptance_rate: 80,
      avg_people_per_party: 3,
      max_people_per_party: 4,
      newcomers: 4,
      newcomers_returned: 2,
      repeat_people: 1,
      age: { min: 24, avg: 38, max: 55 },
      social_spots: 1,
    })
  })

  it("has no age when nobody in the range gave a date of birth", async () => {
    const september = await party("September", "2025-09-20T22:00:00.000Z")
    await join(september.id, (await person("no-birth")).id)

    expect((await getPartySummary(range)).age).toBeNull()
  })

  it("tells how many days before each party people applied and paid, by the median", async () => {
    const september = await party("September", "2025-09-20T22:00:00.000Z")
    const applied = async (name: string, appliedAt: string, paidAt: string | null) => {
      const participant = await createTestEventParticipant(tracker, kysely, {
        event_id: september.id,
        profile_id: (await person(name)).id,
        application_date: appliedAt,
      })
      if (paidAt) {
        await createTestPayment(tracker, kysely, {
          event_participant_id: participant.id,
          paid_at: paidAt,
        })
      }
    }

    await applied("early", "2025-08-21T22:00:00.000Z", "2025-08-31T22:00:00.000Z")
    await applied("middle", "2025-09-06T22:00:00.000Z", "2025-09-10T22:00:00.000Z")
    await applied("late", "2025-09-15T22:00:00.000Z", null)

    expect(await getTimingData(range)).toEqual([
      expect.objectContaining({
        title: "September",
        dias_inscricao: 14,
        dias_pagamento: 15,
      }),
    ])
  })
})

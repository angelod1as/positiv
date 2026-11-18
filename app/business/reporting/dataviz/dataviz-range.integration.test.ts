import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"
import type { EventStatus } from "~types/database/entities.types"
import {
  getDemographicsData,
  getVeteranRookieData,
} from "./demographics-dataviz.server"
import {
  getConversionFunnelData,
  getEventAttendanceData,
  getEventRevenueData,
  getOccupancyData,
} from "./event-metrics.server"
import {
  getGrowthData,
  getRetentionData,
  getSeasonalityData,
} from "./growth-retention.server"
import { getKpiScores } from "./kpi-scores.server"
import type { DatavizRange } from "./dataviz-range"

describe("DataViz - party range", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const testPrefix = `dataviz-range-${Date.now()}`

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
    to: "2025-10-31T23:59:59.000Z",
  }

  async function partyWithOneAttendee(title: string, date: string) {
    const event = await createTestEvent(tracker, kysely, {
      title,
      event_status: "Completed" as EventStatus,
      time_event_start: date,
      total_spots: 10,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `${testPrefix}-${title}@test.com`,
      gender: ["Mulher"],
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: profile.id,
      attendance_status: "attended",
      application_status: "finalised",
    })
    await createTestPayment(tracker, kysely, {
      event_participant_id: participant.id,
      base_amount: 10000,
      amount: 10000,
    })
    return event
  }

  beforeEach(async () => {
    await partyWithOneAttendee("before", "2025-08-15T22:00:00.000Z")
    await partyWithOneAttendee("inside", "2025-09-20T22:00:00.000Z")
    await partyWithOneAttendee("after", "2025-11-15T22:00:00.000Z")
  })

  it("keeps every per-party chart to the parties in the range", async () => {
    const charts = await Promise.all([
      getEventAttendanceData(range),
      getEventRevenueData(range),
      getConversionFunnelData(range),
      getOccupancyData(range),
      getVeteranRookieData(range),
    ])

    for (const rows of charts) {
      expect(rows.map((row) => row.title)).toEqual(["inside"])
    }
  })

  it("counts the cards over the parties in the range", async () => {
    const kpis = await getKpiScores(range)

    expect(kpis.total_events_completed).toBe(1)
    expect(kpis.total_unique_attendees).toBe(1)
    expect(kpis.total_revenue).toBe(10000)
  })

  it("counts parties per person, seasonality and attendees' demographics in the range", async () => {
    const [retention, seasonality, demographics] = await Promise.all([
      getRetentionData(range),
      getSeasonalityData(range),
      getDemographicsData("attended", range),
    ])

    expect(retention).toEqual([{ events_attended: 1, num_people: 1 }])
    expect(seasonality.map((row) => row.month_name)).toEqual(["September"])
    expect(demographics.gender).toEqual([
      { category: "Mulher", count: 1, percentage: 100 },
    ])
  })

  it("counts the profiles created in the range", async () => {
    await kysely
      .updateTable("profiles")
      .set({ created_at: "2025-09-10T12:00:00.000Z" })
      .where("email", "=", `${testPrefix}-inside@test.com`)
      .execute()

    const growth = await getGrowthData(range)

    expect(growth.map((row) => row.month)).toEqual(["2025-09"])
  })
})

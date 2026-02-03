import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { loader } from "./dataviz-example"

describe("dataviz-example loader", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    await kysely.deleteFrom("profiles").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should load KPI data successfully", async () => {
    await createTestProfile(tracker, kysely, {
      email: "test1@test.com",
      approved_to_attend: "approved",
    })
    await createTestProfile(tracker, kysely, {
      email: "test2@test.com",
      flag: "yellow",
    })

    const result = await loader()

    expect(result.kpiData).toBeDefined()
    expect(result.kpiData.total_profiles).toBeGreaterThan(0)
    expect(result.kpiData.total_approved).toBeDefined()
    expect(result.kpiData.total_flagged).toBeDefined()
    expect(result.kpiData.attended_3_plus).toBeDefined()
    expect(result.kpiData.attended_5_plus).toBeDefined()
    expect(result.kpiData.avg_no_show_rate).toBeDefined()
  })

  it("should return all required KPI fields", async () => {
    const result = await loader()

    expect(result.kpiData).toHaveProperty("total_profiles")
    expect(result.kpiData).toHaveProperty("total_veterans")
    expect(result.kpiData).toHaveProperty("total_approved")
    expect(result.kpiData).toHaveProperty("total_events_completed")
    expect(result.kpiData).toHaveProperty("total_unique_attendees")
    expect(result.kpiData).toHaveProperty("avg_attendance_per_event")
    expect(result.kpiData).toHaveProperty("avg_occupancy_pct")
    expect(result.kpiData).toHaveProperty("total_revenue")
    expect(result.kpiData).toHaveProperty("avg_revenue_per_event")
    expect(result.kpiData).toHaveProperty("avg_ticket_price")
    expect(result.kpiData).toHaveProperty("total_flagged")
    expect(result.kpiData).toHaveProperty("attended_3_plus")
    expect(result.kpiData).toHaveProperty("attended_5_plus")
    expect(result.kpiData).toHaveProperty("avg_no_show_rate")
  })
})

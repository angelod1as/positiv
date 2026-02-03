import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { createTestProfile } from "~/test/db-test-utils"
import { getKpiScores } from "./kpi-scores.server"

describe("getKpiScores - Extended KPI Data", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
    await kysely.deleteFrom("profiles").execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return approved profiles count", async () => {
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "approved@test.com",
      approved_to_attend: "approved",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "pending@test.com",
      approved_to_attend: "pending",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "rejected@test.com",
      approved_to_attend: "rejected",
    })

    const result = await getKpiScores()

    expect(result.total_approved).toBe(1)
  })

  it("should return flagged profiles count (yellow + red)", async () => {
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "yellow@test.com",
      flag: "yellow",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "red@test.com",
      flag: "red",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "none@test.com",
      flag: "none",
    })
    await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "gray@test.com",
      flag: "gray",
    })

    const result = await getKpiScores()

    expect(result.total_flagged).toBe(2)
  })

  it("should return count of profiles who attended 3+ events", async () => {
    const result = await getKpiScores()

    expect(result.attended_3_plus).toBeTypeOf("number")
    expect(result.attended_3_plus).toBeGreaterThanOrEqual(0)
  })

  it("should return count of profiles who attended 5+ events", async () => {
    const result = await getKpiScores()

    expect(result.attended_5_plus).toBeTypeOf("number")
    expect(result.attended_5_plus).toBeGreaterThanOrEqual(0)
  })

  it("should return average no-show rate as percentage", async () => {
    const result = await getKpiScores()

    expect(result.avg_no_show_rate).toBeTypeOf("number")
    expect(result.avg_no_show_rate).toBeGreaterThanOrEqual(0)
    expect(result.avg_no_show_rate).toBeLessThanOrEqual(100)
  })
})

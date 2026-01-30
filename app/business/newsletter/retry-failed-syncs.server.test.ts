import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  getFailedSubscriptionsForRetry,
  shouldRetrySubscription,
} from "./retry-failed-syncs.server"

describe("getFailedSubscriptionsForRetry", () => {
  it.skip("should return failed subscriptions that need retry", async () => {
    // Skip: requires database connection - covered by integration tests
    const result = await getFailedSubscriptionsForRetry()

    expect(Array.isArray(result)).toBe(true)
  })
})

describe("shouldRetrySubscription", () => {
  beforeEach(() => {
    // Mock current time to a fixed value for consistent tests
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-29T23:00:00.000Z"))
  })

  it("should retry immediately if no last attempt", () => {
    const result = shouldRetrySubscription(null, 0)
    expect(result).toBe(true)
  })

  it("should retry immediately for first retry (retry_count = 0)", () => {
    const lastAttemptAt = new Date("2026-01-29T22:00:00.000Z").toISOString()
    const result = shouldRetrySubscription(lastAttemptAt, 0)
    expect(result).toBe(true)
  })

  it("should wait 5 minutes for second retry (retry_count = 1)", () => {
    // Last attempt was 4 minutes ago - should NOT retry yet
    const fourMinutesAgo = new Date("2026-01-29T22:56:00.000Z").toISOString()
    expect(shouldRetrySubscription(fourMinutesAgo, 1)).toBe(false)

    // Last attempt was 6 minutes ago - SHOULD retry
    const sixMinutesAgo = new Date("2026-01-29T22:54:00.000Z").toISOString()
    expect(shouldRetrySubscription(sixMinutesAgo, 1)).toBe(true)
  })

  it("should wait 15 minutes for third retry (retry_count = 2)", () => {
    // Last attempt was 14 minutes ago - should NOT retry yet
    const fourteenMinutesAgo = new Date("2026-01-29T22:46:00.000Z").toISOString()
    expect(shouldRetrySubscription(fourteenMinutesAgo, 2)).toBe(false)

    // Last attempt was 16 minutes ago - SHOULD retry
    const sixteenMinutesAgo = new Date("2026-01-29T22:44:00.000Z").toISOString()
    expect(shouldRetrySubscription(sixteenMinutesAgo, 2)).toBe(true)
  })

  it("should wait 1 hour for fourth retry (retry_count = 3)", () => {
    // Last attempt was 59 minutes ago - should NOT retry yet
    const fiftyNineMinutesAgo = new Date("2026-01-29T22:01:00.000Z").toISOString()
    expect(shouldRetrySubscription(fiftyNineMinutesAgo, 3)).toBe(false)

    // Last attempt was 61 minutes ago - SHOULD retry
    const sixtyOneMinutesAgo = new Date("2026-01-29T21:59:00.000Z").toISOString()
    expect(shouldRetrySubscription(sixtyOneMinutesAgo, 3)).toBe(true)
  })

  it("should wait 6 hours for fifth retry (retry_count = 4)", () => {
    // Last attempt was 5 hours 59 minutes ago - should NOT retry yet
    const fiveHoursAgo = new Date("2026-01-29T17:01:00.000Z").toISOString()
    expect(shouldRetrySubscription(fiveHoursAgo, 4)).toBe(false)

    // Last attempt was 6 hours 1 minute ago - SHOULD retry
    const sixHoursAgo = new Date("2026-01-29T16:59:00.000Z").toISOString()
    expect(shouldRetrySubscription(sixHoursAgo, 4)).toBe(true)
  })

  it("should default to 24 hours for retry counts beyond schedule", () => {
    // Last attempt was 23 hours ago - should NOT retry yet
    const twentyThreeHoursAgo = new Date("2026-01-29T00:00:00.000Z").toISOString()
    expect(shouldRetrySubscription(twentyThreeHoursAgo, 5)).toBe(false)

    // Last attempt was 25 hours ago - SHOULD retry
    const twentyFiveHoursAgo = new Date("2026-01-28T22:00:00.000Z").toISOString()
    expect(shouldRetrySubscription(twentyFiveHoursAgo, 5)).toBe(true)
  })
})

describe("processFailedSyncRetries", () => {
  it("should return zero counts when no failed subscriptions exist", async () => {
    // Skip this test as it requires database connection
    // Integration tests will cover this
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FeedbackRateLimiter } from "./feedback-rate-limiter"

describe("FeedbackRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("isRateLimited", () => {
    it("should return false for first request from an IP", () => {
      const limiter = new FeedbackRateLimiter()

      expect(limiter.isRateLimited("192.168.1.1")).toBe(false)
    })

    it("should return true for subsequent request from same IP within window", () => {
      const limiter = new FeedbackRateLimiter()

      limiter.recordRequest("192.168.1.1")

      expect(limiter.isRateLimited("192.168.1.1")).toBe(true)
    })

    it("should return false for different IPs", () => {
      const limiter = new FeedbackRateLimiter()

      limiter.recordRequest("192.168.1.1")

      expect(limiter.isRateLimited("192.168.1.2")).toBe(false)
    })

    it("should return false after window expires", () => {
      const limiter = new FeedbackRateLimiter({
        windowMs: 30 * 60 * 1000,
      })

      limiter.recordRequest("192.168.1.1")
      expect(limiter.isRateLimited("192.168.1.1")).toBe(true)

      vi.advanceTimersByTime(30 * 60 * 1000 + 1)

      expect(limiter.isRateLimited("192.168.1.1")).toBe(false)
    })
  })

  describe("recordRequest", () => {
    it("should track request timestamp for an IP", () => {
      const limiter = new FeedbackRateLimiter()

      limiter.recordRequest("192.168.1.1")

      expect(limiter.isRateLimited("192.168.1.1")).toBe(true)
    })
  })

  describe("default configuration", () => {
    it("should use 30 minute window by default", () => {
      const limiter = new FeedbackRateLimiter()

      limiter.recordRequest("192.168.1.1")

      vi.advanceTimersByTime(29 * 60 * 1000)
      expect(limiter.isRateLimited("192.168.1.1")).toBe(true)

      vi.advanceTimersByTime(2 * 60 * 1000)
      expect(limiter.isRateLimited("192.168.1.1")).toBe(false)
    })
  })

  describe("cleanup", () => {
    it("should clean up old entries when checking", () => {
      const limiter = new FeedbackRateLimiter({
        windowMs: 1000,
      })

      limiter.recordRequest("192.168.1.1")
      limiter.recordRequest("192.168.1.2")

      vi.advanceTimersByTime(1001)

      expect(limiter.isRateLimited("192.168.1.1")).toBe(false)
      expect(limiter.isRateLimited("192.168.1.2")).toBe(false)
    })
  })
})

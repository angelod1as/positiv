import { describe, expect, it, beforeEach, vi } from "vitest"
import { RateLimiter } from "./rate-limiter"

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("should allow requests within the limit", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 })
    const clientId = "127.0.0.1"

    expect(limiter.checkLimit(clientId)).toBe(true)
    expect(limiter.checkLimit(clientId)).toBe(true)
    expect(limiter.checkLimit(clientId)).toBe(true)
  })

  it("should block requests exceeding the limit", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 })
    const clientId = "127.0.0.1"

    expect(limiter.checkLimit(clientId)).toBe(true)
    expect(limiter.checkLimit(clientId)).toBe(true)
    expect(limiter.checkLimit(clientId)).toBe(false)
    expect(limiter.checkLimit(clientId)).toBe(false)
  })

  it("should reset the limit after the time window", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 })
    const clientId = "127.0.0.1"

    expect(limiter.checkLimit(clientId)).toBe(true)
    expect(limiter.checkLimit(clientId)).toBe(true)
    expect(limiter.checkLimit(clientId)).toBe(false)

    // Move time forward past the window
    vi.advanceTimersByTime(61000)

    expect(limiter.checkLimit(clientId)).toBe(true)
    expect(limiter.checkLimit(clientId)).toBe(true)
    expect(limiter.checkLimit(clientId)).toBe(false)
  })

  it("should track different clients separately", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60000 })

    expect(limiter.checkLimit("client1")).toBe(true)
    expect(limiter.checkLimit("client1")).toBe(false)
    expect(limiter.checkLimit("client2")).toBe(true)
    expect(limiter.checkLimit("client2")).toBe(false)
  })

  it("should clean up old entries", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60000 })

    // Add entries for multiple clients
    limiter.checkLimit("client1")
    limiter.checkLimit("client2")
    limiter.checkLimit("client3")

    // Move time forward to trigger cleanup
    vi.advanceTimersByTime(121000) // 2 minutes

    // Old entries should be cleaned up
    expect(limiter.checkLimit("client1")).toBe(true)
    expect(limiter.checkLimit("client2")).toBe(true)
    expect(limiter.checkLimit("client3")).toBe(true)
  })

  it("should return remaining attempts", () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 })
    const clientId = "127.0.0.1"

    expect(limiter.getRemainingAttempts(clientId)).toBe(3)
    limiter.checkLimit(clientId)
    expect(limiter.getRemainingAttempts(clientId)).toBe(2)
    limiter.checkLimit(clientId)
    expect(limiter.getRemainingAttempts(clientId)).toBe(1)
    limiter.checkLimit(clientId)
    expect(limiter.getRemainingAttempts(clientId)).toBe(0)
  })

  it("should return reset time", () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 })
    const clientId = "127.0.0.1"
    
    const now = Date.now()
    vi.setSystemTime(now)
    
    limiter.checkLimit(clientId)
    const resetTime = limiter.getResetTime(clientId)
    
    expect(resetTime).toBe(now + 60000)
  })
})
import { describe, expect, it } from "vitest"
import {
  generateUnsubscribeToken,
  validateUnsubscribeToken,
  parseUnsubscribeToken,
} from "./unsubscribe-tokens.server"

describe("Unsubscribe Token System", () => {
  describe("generateUnsubscribeToken", () => {
    it("should generate a unique token for a profile", () => {
      const profileId = "550e8400-e29b-41d4-a716-446655440000"
      const token = generateUnsubscribeToken(profileId)

      expect(token).toBeDefined()
      expect(typeof token).toBe("string")
      expect(token.length).toBeGreaterThan(0)
    })

    it("should generate different tokens for different profiles", () => {
      const profileId1 = "550e8400-e29b-41d4-a716-446655440001"
      const profileId2 = "550e8400-e29b-41d4-a716-446655440002"

      const token1 = generateUnsubscribeToken(profileId1)
      const token2 = generateUnsubscribeToken(profileId2)

      expect(token1).not.toBe(token2)
    })

    it("should generate different tokens for same profile on different calls", () => {
      const profileId = "550e8400-e29b-41d4-a716-446655440000"

      const token1 = generateUnsubscribeToken(profileId)
      const token2 = generateUnsubscribeToken(profileId)

      expect(token1).not.toBe(token2)
    })
  })

  describe("parseUnsubscribeToken", () => {
    it("should extract profile ID from valid token", () => {
      const profileId = "550e8400-e29b-41d4-a716-446655440000"
      const token = generateUnsubscribeToken(profileId)

      const parsed = parseUnsubscribeToken(token)

      expect(parsed).toBeDefined()
      expect(parsed?.profileId).toBe(profileId)
      expect(parsed?.timestamp).toBeDefined()
      expect(typeof parsed?.timestamp).toBe("number")
    })

    it("should return null for invalid token format", () => {
      const invalidToken = "invalid-token"

      const parsed = parseUnsubscribeToken(invalidToken)

      expect(parsed).toBeNull()
    })

    it("should return null for tampered token", () => {
      const profileId = "550e8400-e29b-41d4-a716-446655440000"
      const token = generateUnsubscribeToken(profileId)
      const tamperedToken = token.slice(0, -5) + "xxxxx"

      const parsed = parseUnsubscribeToken(tamperedToken)

      expect(parsed).toBeNull()
    })
  })

  describe("validateUnsubscribeToken", () => {
    it("should validate a fresh token", () => {
      const profileId = "550e8400-e29b-41d4-a716-446655440000"
      const token = generateUnsubscribeToken(profileId)

      const result = validateUnsubscribeToken(token)

      expect(result.valid).toBe(true)
      expect(result.profileId).toBe(profileId)
      expect(result.error).toBeUndefined()
    })

    it("should reject an expired token", () => {
      const profileId = "550e8400-e29b-41d4-a716-446655440000"
      
      // Mock Date.now to return a time 25 hours in the future
      const originalDateNow = Date.now
      const futureTime = Date.now() + 25 * 60 * 60 * 1000
      
      // Generate token with current time
      const token = generateUnsubscribeToken(profileId)
      
      // Mock Date.now to simulate 25 hours passing
      Date.now = () => futureTime
      
      const result = validateUnsubscribeToken(token)
      
      // Restore original Date.now
      Date.now = originalDateNow

      expect(result.valid).toBe(false)
      expect(result.error).toBe("expired")
      expect(result.profileId).toBeUndefined()
    })

    it("should reject an invalid token", () => {
      const result = validateUnsubscribeToken("invalid-token")

      expect(result.valid).toBe(false)
      expect(result.error).toBe("invalid")
      expect(result.profileId).toBeUndefined()
    })

    it("should reject a tampered token", () => {
      const profileId = "550e8400-e29b-41d4-a716-446655440000"
      const token = generateUnsubscribeToken(profileId)
      const tamperedToken = token.slice(0, -5) + "xxxxx"

      const result = validateUnsubscribeToken(tamperedToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe("invalid")
      expect(result.profileId).toBeUndefined()
    })
  })
})
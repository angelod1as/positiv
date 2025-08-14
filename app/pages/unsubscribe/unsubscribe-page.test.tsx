import { describe, expect, it, vi, beforeEach } from "vitest"
import { loader, action } from "./unsubscribe-page"
import * as unsubscribeTokens from "~/business/admin/newsletter/unsubscribe-tokens.server"
import * as unsubscribeService from "~/business/admin/newsletter/unsubscribe.server"

vi.mock("~/business/admin/newsletter/unsubscribe-tokens.server", () => ({
  validateUnsubscribeToken: vi.fn(),
}))

vi.mock("~/business/admin/newsletter/unsubscribe.server", () => ({
  processUnsubscribe: vi.fn(),
}))

describe("UnsubscribePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("loader", () => {
    it("should validate token and return profile ID when valid", async () => {
      const mockProfileId = "550e8400-e29b-41d4-a716-446655440000"
      vi.mocked(unsubscribeTokens.validateUnsubscribeToken).mockReturnValue({
        valid: true,
        profileId: mockProfileId,
      })

      const request = new Request("http://localhost:3000/unsubscribe/validtoken")
      const params = { token: "validtoken" }
      const result = await loader({ request, params, context: {} })

      expect(result).toEqual({
        tokenValid: true,
        profileId: mockProfileId,
        error: null,
      })
    })

    it("should return error when token is invalid", async () => {
      vi.mocked(unsubscribeTokens.validateUnsubscribeToken).mockReturnValue({
        valid: false,
        error: "invalid",
      })

      const request = new Request("http://localhost:3000/unsubscribe/invalidtoken")
      const params = { token: "invalidtoken" }
      const result = await loader({ request, params, context: {} })

      expect(result).toEqual({
        tokenValid: false,
        profileId: null,
        error: "invalid",
      })
    })

    it("should return error when token is expired", async () => {
      vi.mocked(unsubscribeTokens.validateUnsubscribeToken).mockReturnValue({
        valid: false,
        error: "expired",
      })

      const request = new Request("http://localhost:3000/unsubscribe/expiredtoken")
      const params = { token: "expiredtoken" }
      const result = await loader({ request, params, context: {} })

      expect(result).toEqual({
        tokenValid: false,
        profileId: null,
        error: "expired",
      })
    })
  })

  describe("action", () => {
    it("should process unsubscribe and return success", async () => {
      vi.mocked(unsubscribeService.processUnsubscribe).mockResolvedValue({
        success: true,
        profileId: "550e8400-e29b-41d4-a716-446655440000",
        alreadyUnsubscribed: false,
      } as const)

      const formData = new FormData()
      formData.append("profileId", "550e8400-e29b-41d4-a716-446655440000")

      const request = new Request("http://localhost:3000/unsubscribe/token", {
        method: "POST",
        body: formData,
      })

      const result = await action({ request, params: {}, context: {} })

      expect(result).toEqual({
        success: true,
        alreadyUnsubscribed: false,
        rateLimited: false,
      })
    })

    it("should handle already unsubscribed profiles", async () => {
      vi.mocked(unsubscribeService.processUnsubscribe).mockResolvedValue({
        success: true,
        profileId: "550e8400-e29b-41d4-a716-446655440000",
        alreadyUnsubscribed: true,
      } as const)

      const formData = new FormData()
      formData.append("profileId", "550e8400-e29b-41d4-a716-446655440000")

      const request = new Request("http://localhost:3000/unsubscribe/token", {
        method: "POST",
        body: formData,
      })

      const result = await action({ request, params: {}, context: {} })

      expect(result).toEqual({
        success: true,
        alreadyUnsubscribed: true,
        rateLimited: false,
      })
    })
  })

})
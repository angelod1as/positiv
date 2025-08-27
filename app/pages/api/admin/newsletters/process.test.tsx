import { describe, it, expect, vi, beforeEach } from "vitest"
import { action } from "./process"
import * as newsletterScheduler from "~/business/admin/newsletter/newsletter-scheduler.server"
import * as errorHandling from "~/lib/helpers/error-handling"

vi.mock("~/business/admin/newsletter/newsletter-scheduler.server")
vi.mock("~/lib/supabase/db.server", () => ({
  db: {}
}))

describe("Newsletter Process API Security", () => {
  const mockProcessScheduledNewsletters = vi.fn()
  const mockSafeExecute = vi.fn()
  const mockHandleApiError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(newsletterScheduler, "processScheduledNewsletters").mockImplementation(mockProcessScheduledNewsletters)
    vi.spyOn(errorHandling, "safeExecute").mockImplementation(mockSafeExecute)
    vi.spyOn(errorHandling, "handleApiError").mockImplementation(mockHandleApiError)
    
    // Set up the expected internal token
    process.env.INTERNAL_JOB_SECRET = "test-internal-secret-123"
  })

  describe("Authentication Security", () => {
    it("should reject requests without X-Internal-Job-Token header", async () => {
      const request = new Request("http://localhost/api/admin/newsletters/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })

      const response = await action({ request, params: {}, context: {} })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(mockSafeExecute).not.toHaveBeenCalled()
    })

    it("should reject requests with incorrect internal token", async () => {
      const request = new Request("http://localhost/api/admin/newsletters/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Job-Token": "wrong-token"
        }
      })

      const response = await action({ request, params: {}, context: {} })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(mockSafeExecute).not.toHaveBeenCalled()
    })

    it("should reject requests when INTERNAL_JOB_SECRET is not configured", async () => {
      delete process.env.INTERNAL_JOB_SECRET

      const request = new Request("http://localhost/api/admin/newsletters/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Job-Token": "test-internal-secret-123"
        }
      })

      const response = await action({ request, params: {}, context: {} })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(mockSafeExecute).not.toHaveBeenCalled()
    })

    it("should return uniform 401 for all authentication failures (prevents token oracle)", async () => {
      const scenarios: Array<Record<string, string>> = [
        {}, // No header
        { "X-Internal-Job-Token": "" }, // Empty token
        { "X-Internal-Job-Token": "wrong" }, // Wrong token
        { "Authorization": "Bearer test-internal-secret-123" }, // Wrong header name
      ]

      for (const headerOverrides of scenarios) {
        const headers = new Headers({
          "Content-Type": "application/json"
        })
        
        for (const [key, value] of Object.entries(headerOverrides)) {
          headers.set(key, value)
        }

        const request = new Request("http://localhost/api/admin/newsletters/process", {
          method: "POST",
          headers
        })

        const response = await action({ request, params: {}, context: {} })
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe("Unauthorized")
      }
    })

    it("should accept requests with correct internal token", async () => {
      mockSafeExecute.mockResolvedValue({
        success: true,
        data: {
          processedNewsletters: [],
          totalProcessed: 5,
          totalFailed: 1,
          timeLimitReached: false
        }
      })

      const request = new Request("http://localhost/api/admin/newsletters/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Job-Token": "test-internal-secret-123"
        }
      })

      const response = await action({ request, params: {}, context: {} })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockSafeExecute).toHaveBeenCalled()
    })
  })

  describe("Response Data Minimization", () => {
    it("should not include processedNewsletters details in response", async () => {
      const sensitiveData = {
        processedNewsletters: [
          { id: "123", recipientEmail: "user@example.com", subject: "Newsletter" }
        ],
        totalProcessed: 1,
        totalFailed: 0,
        timeLimitReached: false
      }

      mockSafeExecute.mockResolvedValue({
        success: true,
        data: sensitiveData
      })

      const request = new Request("http://localhost/api/admin/newsletters/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Job-Token": "test-internal-secret-123"
        }
      })

      const response = await action({ request, params: {}, context: {} })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.totalProcessed).toBe(1)
      expect(data.totalFailed).toBe(0)
      expect(data.timeLimitReached).toBe(false)
      // Ensure sensitive data is not included
      expect(data.processedNewsletters).toBeUndefined()
    })

    it("should handle error responses properly", async () => {
      const error = new Error("Database connection failed")
      mockSafeExecute.mockResolvedValue({
        success: false,
        error
      })
      
      mockHandleApiError.mockReturnValue(
        Response.json({ error: "Internal server error" }, { status: 500 })
      )

      const request = new Request("http://localhost/api/admin/newsletters/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Job-Token": "test-internal-secret-123"
        }
      })

      await action({ request, params: {}, context: {} })

      expect(mockHandleApiError).toHaveBeenCalledWith(error)
    })
  })

  describe("Legacy Support", () => {
    it("should NOT accept the old Authorization header with service role key", async () => {
      // This test ensures we've removed support for the vulnerable pattern
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
      
      const request = new Request("http://localhost/api/admin/newsletters/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer service-role-key"
        }
      })

      const response = await action({ request, params: {}, context: {} })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(mockSafeExecute).not.toHaveBeenCalled()
    })
  })
})
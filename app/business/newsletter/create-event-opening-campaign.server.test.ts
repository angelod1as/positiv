import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ViewEvent } from "~types/database/entities.types"

vi.mock("~/env.server", () => ({
  env: () => ({
    listmonkApiUrl: "http://localhost:9000",
    listmonkApiUsername: "test",
    listmonkApiPassword: "test",
  }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const { createEventOpeningCampaign } = await import(
  "./create-event-opening-campaign.server"
)

describe("createEventOpeningCampaign", () => {
  const mockEvent: Omit<ViewEvent, "is_applied"> = {
    id: "test-event-id",
    title: "Test Event",
    emoji: "🎉",
    location: "Test Location",
    time_event_start: "2024-12-25T20:00:00-03:00",
    time_event_end: "2024-12-26T04:00:00-03:00",
    time_application_start: "2024-12-01T10:00:00-03:00",
    time_application_end: "2024-12-20T23:59:59-03:00",
    time_interviews_start: null,
    time_interviews_end: null,
    time_group_start: null,
    time_group_end: null,
    time_payment_start: null,
    time_payment_end: null,
    description: "Test Description",
    ticket_price: null,
    event_status: "Registration Open",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Campaign Creation", () => {
    it("should create campaign with correct structure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 123,
            name: "Event Opening: Test Event",
            subject: "Inscrições abertas: Test Event!",
            status: "draft",
          },
        }),
      })

      const result = await createEventOpeningCampaign({
        event: mockEvent,
        listIds: [5],
      })

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:9000/api/campaigns",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.name).toBe("Event Opening: Test Event")
      expect(callBody.subject).toBe("Inscrições abertas: Test Event!")
      expect(callBody.lists).toEqual([5])
      expect(callBody.type).toBe("regular")
      expect(callBody.content_type).toBe("html")
      expect(callBody.template_id).toBe(7)
      expect(callBody.body).toContain("Inscrições Abertas")
    })

    it("should send campaign immediately when sendImmediately is true", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: 123,
              name: "Event Opening: Test Event",
              subject: "Inscrições abertas: Test Event!",
              status: "draft",
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })

      await createEventOpeningCampaign({
        event: mockEvent,
        listIds: [5],
        sendImmediately: true,
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "http://localhost:9000/api/campaigns/123/status",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ status: "running" }),
        })
      )
    })

    it("should support multiple list IDs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 123,
            name: "Event Opening: Test Event",
            subject: "Inscrições abertas: Test Event!",
            status: "draft",
          },
        }),
      })

      await createEventOpeningCampaign({
        event: mockEvent,
        listIds: [1, 5],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.lists).toEqual([1, 5])
    })
  })

  describe("Campaign Body Generation", () => {
    it("should include event title with emoji", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      await createEventOpeningCampaign({
        event: mockEvent,
        listIds: [5],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain('<span style="display: inline-block; line-height: 1;">🎉</span> Test Event')
    })

    it("should include event location", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      await createEventOpeningCampaign({
        event: mockEvent,
        listIds: [5],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain("Test Location")
    })

    it("should include formatted dates and times", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      await createEventOpeningCampaign({
        event: mockEvent,
        listIds: [5],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain("25 de dezembro de 2024")
      expect(callBody.body).toContain("20h")
      expect(callBody.body).toContain("01 de dezembro de 2024")
      expect(callBody.body).toContain("10h")
    })

    it("should include CTA button", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      await createEventOpeningCampaign({
        event: mockEvent,
        listIds: [5],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain("Inscreva-se agora!")
      expect(callBody.body).toContain("background: #bf03c3")
    })

    it("should include important information section", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      await createEventOpeningCampaign({
        event: mockEvent,
        listIds: [5],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain("Informações importantes")
      expect(callBody.body).toContain("Ter participado de edições anteriores")
      expect(callBody.body).toContain("entradas sociais")
    })
  })

  describe("XSS Protection", () => {
    it("should sanitize script tags in event title", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      const maliciousEvent = {
        ...mockEvent,
        title: '<script>alert("XSS")</script>Party',
      }

      await createEventOpeningCampaign({
        event: maliciousEvent,
        listIds: [5],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).not.toContain("<script>")
      expect(callBody.body).not.toContain('alert("XSS")')
      expect(callBody.body).toContain("Party")
    })

    it("should sanitize HTML in event location", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      const maliciousEvent = {
        ...mockEvent,
        location: '<img src=x onerror="alert(\'XSS\')">Place',
      }

      await createEventOpeningCampaign({
        event: maliciousEvent,
        listIds: [5],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).not.toContain("onerror")
      expect(callBody.body).not.toContain("alert")
    })
  })

  describe("Error Handling", () => {
    it("should return error when campaign creation fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Server error",
      })

      const result = await createEventOpeningCampaign({
        event: mockEvent,
        listIds: [5],
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain("Failed to create campaign")
    })
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Event } from "~types/database/entities.types"

vi.mock("~/env.server", () => ({
  env: () => ({
    listmonkApiUrl: "http://localhost:9000",
    listmonkApiUsername: "test",
    listmonkApiPassword: "test",
  }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const { createPreOpeningReminder } = await import(
  "./create-pre-opening-reminder.server"
)

describe("createPreOpeningReminder", () => {
  const mockEvent: Event = {
    id: "test-event-id",
    title: "Test Event",
    emoji: "🎉",
    location: "Test Location",
    time_event_start: "2024-12-25T20:00:00-03:00",
    time_event_end: "2024-12-26T04:00:00-03:00",
    time_application_start: "2024-12-01T10:00:00-03:00",
    time_group_start: null,
    time_group_end: null,
    time_payment_start: null,
    time_payment_end: null,
    description: "Test Description",
    ticket_price: null,
    event_status: "Scheduled",
    event_type: "regular",
    auto_publish: false,
    created_at: "2025-01-01T00:00:00Z",
    total_spots: null,
    listmonk_list_id: null,
    listmonk_list_synced_at: null,
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
            name: "Pre-Opening Reminder: Test Event",
            subject: "⏰ Atenção: Inscrições abrem em 3 dias - Test Event",
            status: "draft",
          },
        }),
      })

      const result = await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
      })

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:9000/api/campaigns",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.name).toBe("Pre-Opening Reminder: Test Event")
      expect(callBody.subject).toBe(
        "⏰ Atenção: Inscrições abrem em 3 dias - Test Event",
      )
      expect(callBody.lists).toEqual([4])
      expect(callBody.type).toBe("regular")
      expect(callBody.content_type).toBe("html")
      expect(callBody.template_id).toBe(7)
      expect(callBody.body).toContain("<h1")
      expect(callBody.body).toContain("Atenção: Inscrições abrem em 3 dias!")
    })

    it("should send campaign immediately when sendImmediately is true", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: 123,
              name: "Pre-Opening Reminder: Test Event",
              subject: "⏰ Atenção: Inscrições abrem em 3 dias - Test Event",
              status: "draft",
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })

      await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
        sendImmediately: true,
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "http://localhost:9000/api/campaigns/123/status",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ status: "running" }),
        }),
      )
    })

    it("should return error when sendImmediately fails", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              id: 123,
              name: "Pre-Opening Reminder: Test Event",
              subject: "⏰ Atenção: Inscrições abrem em 3 dias - Test Event",
              status: "draft",
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })

      const result = await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
        sendImmediately: true,
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain(
        "Failed to start pre-opening campaign 123",
      )
    })

    it("should support multiple list IDs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 123,
            name: "Pre-Opening Reminder: Test Event",
            subject: "⏰ Atenção: Inscrições abrem em 3 dias - Test Event",
            status: "draft",
          },
        }),
      })

      await createPreOpeningReminder({
        event: mockEvent,
        listIds: [1, 4],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.lists).toEqual([1, 4])
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

      await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain(
        '<span style="display: inline-block; line-height: 1;">🎉</span>&nbsp;Test Event',
      )
    })

    it("should include event location", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
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

      await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain("25 de dezembro de 2024")
      expect(callBody.body).toContain("20h")
      expect(callBody.body).toContain("01 de dezembro de 2024")
      expect(callBody.body).toContain("10h")
    })

    it("should include pre-opening specific messaging", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain("Atenção: Inscrições abrem em 3 dias!")
      expect(callBody.body).toContain(
        "O sistema fecha as inscrições AUTOMATICAMENTE quando bater 90 inscrites",
      )
      expect(callBody.body).toContain("selecionaremos 60 pessoas para o evento")
    })

    it("should include CTA button", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain("Acessar Dashboard")
      expect(callBody.body).toContain("background: #bf03c3")
    })

    it("should handle missing event emoji gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      const eventWithoutEmoji = { ...mockEvent, emoji: null }

      await createPreOpeningReminder({
        event: eventWithoutEmoji,
        listIds: [4],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).toContain("Test Event")
      // Header emoji spans will still exist (⏰), but event emoji span should not
      expect(callBody.body).not.toContain("🎉")
    })

    it("should handle missing event location gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      const eventWithoutLocation = { ...mockEvent, location: null }

      await createPreOpeningReminder({
        event: eventWithoutLocation,
        listIds: [4],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      // Should still create the campaign without throwing
      expect(callBody.name).toBe("Pre-Opening Reminder: Test Event")
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

      await createPreOpeningReminder({
        event: maliciousEvent,
        listIds: [4],
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

      await createPreOpeningReminder({
        event: maliciousEvent,
        listIds: [4],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).not.toContain("onerror")
      expect(callBody.body).not.toContain("alert")
    })

    it("should sanitize HTML in event description", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 123, name: "", subject: "", status: "draft" },
        }),
      })

      const maliciousEvent = {
        ...mockEvent,
        description: '<iframe src="evil.com"></iframe>Description',
      }

      await createPreOpeningReminder({
        event: maliciousEvent,
        listIds: [4],
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.body).not.toContain("<iframe")
      expect(callBody.body).not.toContain("evil.com")
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

      const result = await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain(
        "Failed to create pre-opening campaign",
      )
    })

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const result = await createPreOpeningReminder({
        event: mockEvent,
        listIds: [4],
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain("Network error")
    })
  })
})

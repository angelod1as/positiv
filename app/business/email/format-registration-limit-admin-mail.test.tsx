import { describe, expect, it } from "vitest"
import { formatRegistrationLimitAdminMail } from "./format-registration-limit-admin-mail"
import type { Event } from "~types/database/entities.types"

describe("formatRegistrationLimitAdminMail", () => {
    const mockEvent: Event = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Test Event",
    emoji: "🎉",
    location: "Test Location",
    description: "Test Description",
    time_event_start: "2026-02-15T19:00:00Z",
    time_event_end: "2026-02-16T03:00:00Z",
    time_application_start: "2026-02-01T00:00:00Z",
    time_group_start: "2026-02-14T19:00:00Z",
    time_group_end: "2026-02-14T20:00:00Z",
    time_payment_start: "2026-02-12T00:00:00Z",
    time_payment_end: "2026-02-14T23:59:59Z",
    ticket_price: 3000,
    event_status: "Registration Closed",
    event_type: "regular",
    auto_publish: false,
    created_at: "2025-01-01T00:00:00Z",
    total_spots: null,
    listmonk_list_id: null,
    listmonk_list_synced_at: null,
  }

  const participantCount = 90
  const timestamp = new Date("2026-02-01T14:30:00Z")

  it("should return both html and text", async () => {
    const result = await formatRegistrationLimitAdminMail(
      mockEvent,
      participantCount,
      timestamp,
    )

    expect(result).toHaveProperty("html")
    expect(result).toHaveProperty("text")
    expect(typeof result.html).toBe("string")
    expect(typeof result.text).toBe("string")
  })

  it("should include event details in html", async () => {
    const result = await formatRegistrationLimitAdminMail(
      mockEvent,
      participantCount,
      timestamp,
    )

    expect(result.html).toContain("Test Event")
    expect(result.html).toContain("🎉")
    expect(result.html).toContain("90 participantes")
  })

  it("should convert html to plain text", async () => {
    const result = await formatRegistrationLimitAdminMail(
      mockEvent,
      participantCount,
      timestamp,
    )

    expect(result.text).toContain("Test Event")
    expect(result.text).toContain("90")
    expect(result.text).not.toContain("<html")
    expect(result.text).not.toContain("<body")
  })

  it("should include event ID in text for reference", async () => {
    const result = await formatRegistrationLimitAdminMail(
      mockEvent,
      participantCount,
      timestamp,
    )

    expect(result.text).toContain(mockEvent.id)
  })
})

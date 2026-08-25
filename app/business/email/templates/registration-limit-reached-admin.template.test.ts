import { describe, expect, it } from "vitest"
import { registrationLimitReachedAdminTemplate } from "./registration-limit-reached-admin.template"
import type { Event } from "~types/database/entities.types"

describe("registrationLimitReachedAdminTemplate", () => {
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

  const timestamp = new Date("2026-02-01T14:30:00Z")
  const participantCount = 90

  it("should generate email HTML with event details", () => {
    const html = registrationLimitReachedAdminTemplate(
      mockEvent,
      participantCount,
      timestamp,
    )

    expect(html).toContain("<!DOCTYPE html")
    expect(html).toContain("Evento atingiu limite de candidaturas")
    expect(html).toContain("Test Event")
    expect(html).toContain("🎉")
    expect(html).toContain("90 participantes")
  })

  it("should include link to participants page", () => {
    const html = registrationLimitReachedAdminTemplate(
      mockEvent,
      participantCount,
      timestamp,
    )

    expect(html).toContain(`/admin/events/${mockEvent.id}/participants`)
    expect(html).toContain("Ver Participantes")
  })

  it("should include formatted timestamp", () => {
    const html = registrationLimitReachedAdminTemplate(
      mockEvent,
      participantCount,
      timestamp,
    )

    expect(html).toContain("01 de fevereiro de 2026")
    expect(html).toContain("11h")
  })

  it("should handle event without emoji", () => {
    const eventWithoutEmoji = { ...mockEvent, emoji: null }
    const html = registrationLimitReachedAdminTemplate(
      eventWithoutEmoji,
      participantCount,
      timestamp,
    )

    expect(html).toContain("Test Event")
    expect(html).not.toContain("🎉")
  })

  it("should sanitize event title", () => {
    const eventWithXSS = {
      ...mockEvent,
      title: '<script>alert("xss")</script>Malicious Event',
    }
    const html = registrationLimitReachedAdminTemplate(
      eventWithXSS,
      participantCount,
      timestamp,
    )

    expect(html).not.toContain("<script>")
    expect(html).not.toContain('alert("xss")')
  })

  it("should sanitize event emoji", () => {
    const eventWithXSS = {
      ...mockEvent,
      emoji: '<img src=x onerror="alert(1)">',
    }
    const html = registrationLimitReachedAdminTemplate(
      eventWithXSS,
      participantCount,
      timestamp,
    )

    expect(html).not.toContain("onerror")
    expect(html).not.toContain("alert(1)")
  })
})

import { describe, expect, it } from "vitest"
import { registrationLimitReachedAdminTemplate } from "./registration-limit-reached-admin.template"

describe("registrationLimitReachedAdminTemplate", () => {
  const eventId = "123e4567-e89b-12d3-a456-426614174000"
  const eventTitle = "Test Event"
  const eventEmoji = "🎉"
  const participantCount = 90
  const timestamp = new Date("2026-02-01T14:30:00Z")

  it("should generate email HTML with event details", () => {
    const html = registrationLimitReachedAdminTemplate(
      eventId, eventTitle, eventEmoji, participantCount, timestamp,
    )

    expect(html).toContain("<!DOCTYPE html")
    expect(html).toContain("Evento atingiu limite de inscrições")
    expect(html).toContain("Test Event")
    expect(html).toContain("🎉")
    expect(html).toContain("90 participantes")
  })

  it("should include link to participants page", () => {
    const html = registrationLimitReachedAdminTemplate(
      eventId, eventTitle, eventEmoji, participantCount, timestamp,
    )

    expect(html).toContain(`/admin/events/${eventId}/participants`)
    expect(html).toContain("Ver Participantes")
  })

  it("should include formatted timestamp", () => {
    const html = registrationLimitReachedAdminTemplate(
      eventId, eventTitle, eventEmoji, participantCount, timestamp,
    )

    expect(html).toContain("01 de fevereiro de 2026")
    expect(html).toContain("11h")
  })

  it("should handle event without emoji", () => {
    const html = registrationLimitReachedAdminTemplate(
      eventId, eventTitle, null, participantCount, timestamp,
    )

    expect(html).toContain("Test Event")
    expect(html).not.toContain("🎉")
  })

  it("should sanitize event title", () => {
    const html = registrationLimitReachedAdminTemplate(
      eventId,
      '<script>alert("xss")</script>Malicious Event',
      eventEmoji, participantCount, timestamp,
    )

    expect(html).not.toContain("<script>")
    expect(html).not.toContain('alert("xss")')
  })

  it("should sanitize event emoji", () => {
    const html = registrationLimitReachedAdminTemplate(
      eventId, eventTitle,
      '<img src=x onerror="alert(1)">',
      participantCount, timestamp,
    )

    expect(html).not.toContain("onerror")
    expect(html).not.toContain("alert(1)")
  })
})

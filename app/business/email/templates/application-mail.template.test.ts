import { describe, expect, it } from "vitest"
import type { ProfileWithRoles, ViewEvent } from "~types/database/entities.types"
import { applicationMailTemplate } from "./application-mail.template"

describe("applicationMailTemplate", () => {
  const mockProfile: NonNullable<ProfileWithRoles> = {
    id: "test-profile-id",
    full_name: "Test User",
    social_name: "Testy",
    email: "test@example.com",
    basic_data_filled: true,
    created_at: "2024-01-01T00:00:00Z",
    is_admin: false,
  }

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

  it("should return a string", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(typeof result).toBe("string")
  })

  it("should be valid HTML with DOCTYPE", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("<!DOCTYPE html>")
    expect(result).toContain("<html lang=\"pt-BR\">")
    expect(result).toContain("</html>")
  })

  it("should include Brand Purple gradient background", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain(
      "linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%)",
    )
  })

  it("should include Positiv logo", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("positiv-logo-colors.png")
  })

  it("should use social_name when available", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("Testy")
    expect(result).not.toContain("Test User")
  })

  it("should fallback to full_name when social_name is not available", () => {
    const profileWithoutSocialName = {
      ...mockProfile,
      social_name: null,
    }
    const result = applicationMailTemplate(profileWithoutSocialName, mockEvent)
    expect(result).toContain("Test User")
  })

  it("should include event title with emoji", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("🎉 Test Event")
    expect(result).toContain("🎉&nbsp;Test Event")
  })

  it("should include event location", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("Test Location")
  })

  it("should format event date in Brazilian Portuguese", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("25 de dezembro de 2024")
  })

  it("should format event time with h suffix", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("20h")
  })

  it("should include event details section", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("Evento:")
    expect(result).toContain("Local:")
    expect(result).toContain("Data:")
    expect(result).toContain("Horário de início:")
  })

  it("should include important notes section", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("Importante!")
    expect(result).toContain("Não se esqueça:")
  })

  it("should include all important bullet points", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("Ter participado de edições anteriores")
    expect(result).toContain("Se você quer ir acompanhade")
    expect(result).toContain("Inscrever-se no formulário")
    expect(result).toContain("entradas sociais")
  })

  it("should include footer with Positiv link", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("Você recebeu este e-mail pois se cadastrou")
    expect(result).toContain("Positiv")
    expect(result).toContain("Configurações")
  })

  it("should include account settings link", () => {
    const result = applicationMailTemplate(mockProfile, mockEvent)
    expect(result).toContain("conta")
  })
})

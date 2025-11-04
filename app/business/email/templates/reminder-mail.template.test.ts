import { describe, expect, it } from "vitest"
import type { ViewEvent } from "~types/database/entities.types"
import { reminderMailTemplate } from "./reminder-mail.template"

describe("reminderMailTemplate", () => {
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
    const result = reminderMailTemplate(mockEvent)
    expect(typeof result).toBe("string")
  })

  it("should be valid HTML with DOCTYPE", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("<!DOCTYPE html>")
    expect(result).toContain("<html lang=\"pt-BR\">")
    expect(result).toContain("</html>")
  })

  it("should include Brand Purple gradient background", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain(
      "linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%)",
    )
  })

  it("should include Positiv logo", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("positiv-logo-colors.png")
  })

  it("should include main heading", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("Inscrições abertas!")
  })

  it("should include event title with emoji in intro", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("🎉&nbsp;Test Event")
  })

  it("should include CTA button", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("Inscreva-se já!")
    expect(result).toMatch(/background: #bf03c3/)
  })

  it("should include reminder message", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain(
      "Você pediu para ser lembrado quando as inscrições abrissem",
    )
  })

  it("should include event location", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("Test Location")
  })

  it("should format event start date in Brazilian Portuguese", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("25 de dezembro de 2024")
  })

  it("should format event start time with h suffix", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("20h")
  })

  it("should format application open date", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("01 de dezembro de 2024")
  })

  it("should format application open time", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("10h")
  })

  it("should format application close date", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("20 de dezembro de 2024")
  })

  it("should format application close time", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("23h")
  })

  it("should include all event details labels", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("Evento:")
    expect(result).toContain("Local:")
    expect(result).toContain("Data do evento:")
    expect(result).toContain("Horário de início:")
    expect(result).toContain("Inscrições abrem em:")
    expect(result).toContain("Inscrições fecham em:")
  })

  it("should include important notes section", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("Importante!")
    expect(result).toContain("Não se esqueça:")
  })

  it("should include all important bullet points", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("Ter participado de edições anteriores")
    expect(result).toContain("Se você quer ir acompanhade")
    expect(result).toContain("Inscrever-se no formulário")
    expect(result).toContain("entradas sociais")
  })

  it("should include footer with Positiv link", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("Você recebeu este e-mail pois se cadastrou")
    expect(result).toContain("Positiv")
    expect(result).toContain("Configurações")
  })

  it("should include account settings link", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("conta")
  })

  it("should include details in a styled section", () => {
    const result = reminderMailTemplate(mockEvent)
    expect(result).toContain("background: #f9f9f9")
    expect(result).toContain("border-radius: 8px")
  })
})

describe("reminderMailTemplate - XSS Protection", () => {
  const createMockEvent = (
    overrides?: Partial<Omit<ViewEvent, "is_applied">>,
  ): Omit<ViewEvent, "is_applied"> => ({
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
    ...overrides,
  })

  describe("Event Title Sanitization", () => {
    it("should sanitize script tags in event title", () => {
      const event = createMockEvent({
        title: '<script>alert("XSS")</script>Party',
      })

      const html = reminderMailTemplate(event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Party")
    })

    it("should sanitize img tag with onerror in event title", () => {
      const event = createMockEvent({
        title: '<img src=x onerror="alert(\'XSS\')">Party',
      })

      const html = reminderMailTemplate(event)

      expect(html).not.toContain("onerror")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in event title", () => {
      const event = createMockEvent({
        title: "Party <New Year's> & More",
      })

      const html = reminderMailTemplate(event)

      expect(html).toContain("&amp;")
      expect(html).toContain("Party")
      expect(html).toContain("More")
      expect(html).not.toContain("<New Year's>")
    })
  })

  describe("Event Location Sanitization", () => {
    it("should sanitize script tags in location", () => {
      const event = createMockEvent({
        location: '<script>alert("XSS")</script>São Paulo',
      })

      const html = reminderMailTemplate(event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("São Paulo")
    })

    it("should sanitize onclick event handler in location", () => {
      const event = createMockEvent({
        location: '<a href="#" onclick="alert(\'XSS\')">Click</a>',
      })

      const html = reminderMailTemplate(event)

      expect(html).not.toContain("onclick")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in location", () => {
      const event = createMockEvent({
        location: "Street <Main> & Ave",
      })

      const html = reminderMailTemplate(event)

      expect(html).toContain("&amp;")
      expect(html).toContain("Street")
      expect(html).toContain("Ave")
      expect(html).not.toContain("<Main>")
    })
  })

  describe("Event Emoji Sanitization", () => {
    it("should sanitize script tags in emoji field", () => {
      const event = createMockEvent({
        emoji: '<script>alert("XSS")</script>🎉',
      })

      const html = reminderMailTemplate(event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
    })

    it("should allow legitimate emoji characters", () => {
      const event = createMockEvent({
        emoji: "🎉",
      })

      const html = reminderMailTemplate(event)

      expect(html).toContain("🎉")
    })
  })

  describe("Combined Attack Vectors", () => {
    it("should sanitize multiple XSS attempts across all fields", () => {
      const event = createMockEvent({
        title: '<iframe src="https://evil.com">Party</iframe>',
        location: '<a onclick="alert(\'loc\')">Place</a>',
        emoji: '<script>alert("emoji")</script>🎉',
      })

      const html = reminderMailTemplate(event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain("<iframe")
      expect(html).not.toContain("onerror")
      expect(html).not.toContain("onclick")
      expect(html).not.toContain("evil.com")
      expect(html).not.toContain('alert(')
    })
  })

  describe("Legitimate Content Preservation", () => {
    it("should preserve legitimate content after sanitization", () => {
      const event = createMockEvent({
        title: "Festa de Ano Novo",
        location: "São Paulo, SP",
        emoji: "🎉",
      })

      const html = reminderMailTemplate(event)

      expect(html).toContain("Festa de Ano Novo")
      expect(html).toContain("São Paulo, SP")
      expect(html).toContain("🎉")
      expect(html).toContain("Inscrições abertas!")
      expect(html).toContain("Importante!")
    })
  })
})

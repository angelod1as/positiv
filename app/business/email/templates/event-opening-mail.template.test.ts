import { describe, expect, it } from "vitest"
import type { ViewEvent } from "~types/database/entities.types"
import { eventOpeningMailTemplate } from "./event-opening-mail.template"

describe("eventOpeningMailTemplate", () => {
  const mockEvent: Omit<ViewEvent, "is_applied"> = {
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
    event_status: "Registration Open",
  }

  const mockProfileId = "test-profile-123"

  it("should return a string", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(typeof result).toBe("string")
  })

  it("should be valid HTML with DOCTYPE", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("<!DOCTYPE html>")
    expect(result).toContain('<html lang="pt-BR">')
    expect(result).toContain("</html>")
  })

  it("should include Brand Purple gradient background", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain(
      "linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%)",
    )
  })

  it("should include Positiv logo", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("positiv-logo-colors.png")
  })

  it("should include main heading for new event", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("Novo evento disponível! 🎉")
  })

  it("should include event title with emoji in intro", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("🎉&nbsp;Test Event")
  })

  it("should include CTA button", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("Inscreva-se agora!")
    expect(result).toMatch(/background: #bf03c3/)
  })

  it("should include opening announcement message", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("acabam de abrir")
  })

  it("should include urgency message", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("Corra e garanta sua vaga")
  })

  it("should include event location", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("Test Location")
  })

  it("should format event start date in Brazilian Portuguese", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("25 de dezembro de 2024")
  })

  it("should format event start time with h suffix", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("20h")
  })

  it("should format application open date", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("01 de dezembro de 2024")
  })

  it("should format application open time", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("10h")
  })

  it("should include all event details labels", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("Evento:")
    expect(result).toContain("Local:")
    expect(result).toContain("Data do evento:")
    expect(result).toContain("Horário de início:")
    expect(result).toContain("Inscrições abrem em:")
  })

  it("should include important notes section", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("Informações importantes")
  })

  it("should include all important bullet points", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("Ter participado de edições anteriores")
    expect(result).toContain("Se você quer ir acompanhade")
    expect(result).toContain("Inscrever-se no formulário")
    expect(result).toContain("entradas sociais")
  })

  it("should include footer with newsletter subscription message", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("Você recebeu este e-mail pois está inscrite na newsletter")
    expect(result).toContain("Positiv")
  })

  it("should include unsubscribe link with profile ID", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("newsletter/unsubscribe?id=test-profile-123")
    expect(result).toContain("Cancelar inscrição")
  })

  it("should include account settings link", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("conta")
    expect(result).toContain("Configurações")
  })

  it("should include details in a styled section", () => {
    const result = eventOpeningMailTemplate(mockEvent, mockProfileId)
    expect(result).toContain("background: #f9f9f9")
    expect(result).toContain("border-radius: 8px")
  })
})

describe("eventOpeningMailTemplate - XSS Protection", () => {
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
    time_group_start: null,
    time_group_end: null,
    time_payment_start: null,
    time_payment_end: null,
    description: "Test Description",
    ticket_price: null,
    event_status: "Registration Open",
    ...overrides,
  })

  const mockProfileId = "test-profile-123"

  describe("Event Title Sanitization", () => {
    it("should sanitize script tags in event title", () => {
      const event = createMockEvent({
        title: '<script>alert("XSS")</script>Party',
      })

      const html = eventOpeningMailTemplate(event, mockProfileId)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Party")
    })

    it("should sanitize img tag with onerror in event title", () => {
      const event = createMockEvent({
        title: '<img src=x onerror="alert(\'XSS\')">Party',
      })

      const html = eventOpeningMailTemplate(event, mockProfileId)

      expect(html).not.toContain("onerror")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in event title", () => {
      const event = createMockEvent({
        title: "Party <New Year's> & More",
      })

      const html = eventOpeningMailTemplate(event, mockProfileId)

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

      const html = eventOpeningMailTemplate(event, mockProfileId)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("São Paulo")
    })

    it("should sanitize onclick event handler in location", () => {
      const event = createMockEvent({
        location: '<a href="#" onclick="alert(\'XSS\')">Click</a>',
      })

      const html = eventOpeningMailTemplate(event, mockProfileId)

      expect(html).not.toContain("onclick")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in location", () => {
      const event = createMockEvent({
        location: "Street <Main> & Ave",
      })

      const html = eventOpeningMailTemplate(event, mockProfileId)

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

      const html = eventOpeningMailTemplate(event, mockProfileId)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
    })

    it("should allow legitimate emoji characters", () => {
      const event = createMockEvent({
        emoji: "🎉",
      })

      const html = eventOpeningMailTemplate(event, mockProfileId)

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

      const html = eventOpeningMailTemplate(event, mockProfileId)

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

      const html = eventOpeningMailTemplate(event, mockProfileId)

      expect(html).toContain("Festa de Ano Novo")
      expect(html).toContain("São Paulo, SP")
      expect(html).toContain("🎉")
      expect(html).toContain("Novo evento disponível!")
      expect(html).toContain("Informações importantes")
    })
  })
})

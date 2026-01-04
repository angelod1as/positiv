import { describe, expect, it } from "vitest"
import type { ViewEvent } from "~types/database/entities.types"
import { groupClosingMailTemplate } from "./group-closing-mail.template"

describe("groupClosingMailTemplate", () => {
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
    time_group_start: "2024-12-21T00:00:00-03:00",
    time_group_end: null,
    time_payment_start: null,
    time_payment_end: null,
    description: "Test Description",
    ticket_price: null,
    event_status: "Registration Closed",
  }

  it("should return a string", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(typeof result).toBe("string")
  })

  it("should be valid HTML with DOCTYPE", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("<!DOCTYPE html>")
    expect(result).toContain("<html lang=\"pt-BR\">")
    expect(result).toContain("</html>")
  })

  it("should include Brand Purple gradient background", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain(
      "linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%)",
    )
  })

  it("should include Positiv logo", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("positiv-logo-colors.png")
  })

  it("should include main heading 'Fechamos o grupo!'", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("Fechamos o grupo!")
  })

  it("should include lock emoji 🔒 in heading or content", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("🔒")
  })

  it("should include main message 'Quem entrou, entrou. Quem não entrou, que peninha!'", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("Quem entrou, entrou")
    expect(result).toContain("Quem não entrou, que peninha")
  })

  it("should include sad emoji 😢 in message", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("😢")
  })

  it("should include event title with emoji", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("🎉 Test Event")
    expect(result).toContain("🎉&nbsp;Test Event")
  })

  it("should include event location", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("Test Location")
  })

  it("should format event date in Brazilian Portuguese", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("25 de dezembro de 2024")
  })

  it("should format event time with h suffix", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("20h")
  })

  it("should include event details section", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("Evento:")
    expect(result).toContain("Local:")
    expect(result).toContain("Data:")
    expect(result).toContain("Horário de início:")
  })

  it("should include explanation about approval process ending", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("processo de aprovação")
    expect(result).toContain("encerrado")
  })

  it("should include footer with Positiv link", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("Você recebeu este e-mail pois se cadastrou")
    expect(result).toContain("Positiv")
    expect(result).toContain("Configurações")
  })

  it("should include account settings link", () => {
    const result = groupClosingMailTemplate(mockEvent)
    expect(result).toContain("conta")
  })
})

describe("groupClosingMailTemplate - XSS Protection", () => {
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
    time_group_start: "2024-12-21T00:00:00-03:00",
    time_group_end: null,
    time_payment_start: null,
    time_payment_end: null,
    description: "Test Description",
    ticket_price: null,
    event_status: "Registration Closed",
    ...overrides,
  })

  describe("Event Title Sanitization", () => {
    it("should sanitize script tags in event title", () => {
      const event = createMockEvent({
        title: '<script>alert("XSS")</script>Party',
      })

      const html = groupClosingMailTemplate(event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Party")
    })

    it("should sanitize img tag with onerror in event title", () => {
      const event = createMockEvent({
        title: '<img src=x onerror="alert(\'XSS\')">Party',
      })

      const html = groupClosingMailTemplate(event)

      expect(html).not.toContain("onerror")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in event title", () => {
      const event = createMockEvent({
        title: "Party <New Year's> & More",
      })

      const html = groupClosingMailTemplate(event)

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

      const html = groupClosingMailTemplate(event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("São Paulo")
    })

    it("should sanitize onclick event handler in location", () => {
      const event = createMockEvent({
        location: '<a href="#" onclick="alert(\'XSS\')">Click</a>',
      })

      const html = groupClosingMailTemplate(event)

      expect(html).not.toContain("onclick")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in location", () => {
      const event = createMockEvent({
        location: "Street <Main> & Ave",
      })

      const html = groupClosingMailTemplate(event)

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

      const html = groupClosingMailTemplate(event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
    })

    it("should allow legitimate emoji characters", () => {
      const event = createMockEvent({
        emoji: "🎉",
      })

      const html = groupClosingMailTemplate(event)

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

      const html = groupClosingMailTemplate(event)

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

      const html = groupClosingMailTemplate(event)

      expect(html).toContain("Festa de Ano Novo")
      expect(html).toContain("São Paulo, SP")
      expect(html).toContain("🎉")
      expect(html).toContain("Fechamos o grupo!")
      expect(html).toContain("Quem entrou, entrou")
    })
  })
})

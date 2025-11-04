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

describe("applicationMailTemplate - XSS Protection", () => {
  const createMockProfile = (
    overrides?: Partial<ProfileWithRoles>,
  ): NonNullable<ProfileWithRoles> => ({
    id: "test-profile-id",
    full_name: "Test User",
    social_name: null,
    email: "test@example.com",
    basic_data_filled: true,
    created_at: "2024-01-01T00:00:00Z",
    is_admin: false,
    ...overrides,
  })

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

  describe("Profile Name Sanitization", () => {
    it("should sanitize script tags in full_name", () => {
      const profile = createMockProfile({
        full_name: '<script>alert("XSS")</script>John',
        social_name: null,
      })
      const event = createMockEvent()

      const html = applicationMailTemplate(profile, event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain("</script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("John")
    })

    it("should sanitize script tags in social_name", () => {
      const profile = createMockProfile({
        full_name: "John Doe",
        social_name: '<script>alert("XSS")</script>Jane',
      })
      const event = createMockEvent()

      const html = applicationMailTemplate(profile, event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Jane")
    })

    it("should sanitize img tag with onerror in full_name", () => {
      const profile = createMockProfile({
        full_name: '<img src=x onerror="alert(\'XSS\')">John',
        social_name: null,
      })
      const event = createMockEvent()

      const html = applicationMailTemplate(profile, event)

      expect(html).not.toContain("onerror")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should sanitize iframe injection in social_name", () => {
      const profile = createMockProfile({
        full_name: "John Doe",
        social_name: '<iframe src="https://evil.com"></iframe>Jane',
      })
      const event = createMockEvent()

      const html = applicationMailTemplate(profile, event)

      expect(html).not.toContain("<iframe")
      expect(html).not.toContain("evil.com")
      expect(html).toContain("Jane")
    })

    it("should escape HTML entities in legitimate names", () => {
      const profile = createMockProfile({
        full_name: "John <Doe> & Associates",
        social_name: null,
      })
      const event = createMockEvent()

      const html = applicationMailTemplate(profile, event)

      expect(html).toContain("&amp;")
      expect(html).toContain("John")
      expect(html).toContain("Associates")
      expect(html).not.toContain("<Doe>")
    })
  })

  describe("Event Title Sanitization", () => {
    it("should sanitize script tags in event title", () => {
      const profile = createMockProfile()
      const event = createMockEvent({
        title: '<script>alert("XSS")</script>Party',
      })

      const html = applicationMailTemplate(profile, event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Party")
    })

    it("should sanitize img tag with onerror in event title", () => {
      const profile = createMockProfile()
      const event = createMockEvent({
        title: '<img src=x onerror="alert(\'XSS\')">Party',
      })

      const html = applicationMailTemplate(profile, event)

      expect(html).not.toContain("onerror")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in event title", () => {
      const profile = createMockProfile()
      const event = createMockEvent({
        title: "Party <New Year's> & More",
      })

      const html = applicationMailTemplate(profile, event)

      expect(html).toContain("&amp;")
      expect(html).toContain("Party")
      expect(html).toContain("More")
      expect(html).not.toContain("<New Year's>")
    })
  })

  describe("Event Location Sanitization", () => {
    it("should sanitize script tags in location", () => {
      const profile = createMockProfile()
      const event = createMockEvent({
        location: '<script>alert("XSS")</script>São Paulo',
      })

      const html = applicationMailTemplate(profile, event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("São Paulo")
    })

    it("should sanitize onclick event handler in location", () => {
      const profile = createMockProfile()
      const event = createMockEvent({
        location: '<a href="#" onclick="alert(\'XSS\')">Click</a>',
      })

      const html = applicationMailTemplate(profile, event)

      expect(html).not.toContain("onclick")
      expect(html).not.toContain('alert(\'XSS\')')
    })

    it("should escape HTML entities in location", () => {
      const profile = createMockProfile()
      const event = createMockEvent({
        location: "Street <Main> & Ave",
      })

      const html = applicationMailTemplate(profile, event)

      expect(html).toContain("&amp;")
      expect(html).toContain("Street")
      expect(html).toContain("Ave")
      expect(html).not.toContain("<Main>")
    })
  })

  describe("Event Emoji Sanitization", () => {
    it("should sanitize script tags in emoji field", () => {
      const profile = createMockProfile()
      const event = createMockEvent({
        emoji: '<script>alert("XSS")</script>🎉',
      })

      const html = applicationMailTemplate(profile, event)

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
    })

    it("should allow legitimate emoji characters", () => {
      const profile = createMockProfile()
      const event = createMockEvent({
        emoji: "🎉",
      })

      const html = applicationMailTemplate(profile, event)

      expect(html).toContain("🎉")
    })
  })

  describe("Combined Attack Vectors", () => {
    it("should sanitize multiple XSS attempts across all fields", () => {
      const profile = createMockProfile({
        full_name: '<script>alert("name")</script>John',
        social_name: '<img src=x onerror="alert(\'social\')">',
      })
      const event = createMockEvent({
        title: '<iframe src="https://evil.com">Party</iframe>',
        location: '<a onclick="alert(\'loc\')">Place</a>',
        emoji: '<script>alert("emoji")</script>🎉',
      })

      const html = applicationMailTemplate(profile, event)

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
      const profile = createMockProfile({
        full_name: "João da Silva",
        social_name: "Ana Maria",
      })
      const event = createMockEvent({
        title: "Festa de Ano Novo",
        location: "São Paulo, SP",
        emoji: "🎉",
      })

      const html = applicationMailTemplate(profile, event)

      expect(html).toContain("Ana Maria")
      expect(html).toContain("Festa de Ano Novo")
      expect(html).toContain("São Paulo, SP")
      expect(html).toContain("🎉")
      expect(html).toContain("Sua inscrição foi recebida")
      expect(html).toContain("Importante!")
    })
  })
})

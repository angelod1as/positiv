import { describe, expect, it } from "vitest"
import { PAYMENT_PRICING } from "~/integrations/asaas/constants"
import {
  getPaymentLinkEmailSubject,
  paymentLinkEmailTemplate,
} from "./payment-link-email.template"

describe("paymentLinkEmailTemplate", () => {
  const participantName = "Ana Maria"
  const eventTitle = "Festa de Ano Novo"
  const eventEmoji = "🎉"
  const paymentLink = "https://www.asaas.com/c/pay123"
  const expiresAt = new Date("2026-03-13T14:00:00-03:00")

  describe("Basic structure", () => {
    it("should return a string", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(typeof result).toBe("string")
    })

    it("should be valid HTML with DOCTYPE", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("<!DOCTYPE html>")
      expect(result).toContain('<html lang="pt-BR">')
      expect(result).toContain("</html>")
    })

    it("should include Brand Purple gradient background", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain(
        "linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%)",
      )
    })

    it("should include Positiv logo", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("positiv-logo-colors.png")
    })
  })

  describe("Content", () => {
    it("should include heading", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("Link de pagamento")
    })

    it("should include greeting with participant name", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("Olá, Ana Maria!")
    })

    it("should mention event with emoji", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("🎉")
      expect(result).toContain("Festa de Ano Novo")
    })

    it("should handle null emoji", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, null, paymentLink, expiresAt)
      expect(result).toContain("Festa de Ano Novo")
      expect(result).not.toContain("🎉")
    })

    it("should include Pix pricing formatted from centavos", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("Pix")
      expect(result).toContain("R$ 220,00")
    })

    it("should include credit card pricing with installments formatted from centavos", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("Cartão")
      expect(result).toContain("R$ 227,00")
      expect(result).toContain(`${PAYMENT_PRICING.creditCard.maxInstallments}x`)
    })

    it("should include CTA button with payment link", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("Realizar pagamento")
      expect(result).toContain(paymentLink)
    })

    it("should include expiry warning with formatted date", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("13 de março de 2026")
      expect(result).toContain("14h")
    })

    it("should include footer with settings link", () => {
      const result = paymentLinkEmailTemplate(participantName, eventTitle, eventEmoji, paymentLink, expiresAt)
      expect(result).toContain("Configurações")
      expect(result).toContain("conta")
      expect(result).toContain("Positiv")
    })
  })

  describe("XSS Protection", () => {
    it("should sanitize script tags in participant name", () => {
      const html = paymentLinkEmailTemplate(
        '<script>alert("XSS")</script>John',
        eventTitle, eventEmoji, paymentLink, expiresAt,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("John")
    })

    it("should sanitize script tags in event title", () => {
      const html = paymentLinkEmailTemplate(
        participantName,
        '<script>alert("XSS")</script>Party',
        eventEmoji, paymentLink, expiresAt,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain('alert("XSS")')
      expect(html).toContain("Party")
    })

    it("should sanitize img tag with onerror in emoji", () => {
      const html = paymentLinkEmailTemplate(
        participantName, eventTitle,
        '<img src=x onerror="alert(1)">',
        paymentLink, expiresAt,
      )

      expect(html).not.toContain("onerror")
      expect(html).not.toContain("alert(1)")
    })

    it("should sanitize iframe injection in participant name", () => {
      const html = paymentLinkEmailTemplate(
        '<iframe src="https://evil.com"></iframe>Jane',
        eventTitle, eventEmoji, paymentLink, expiresAt,
      )

      expect(html).not.toContain("<iframe")
      expect(html).not.toContain("evil.com")
      expect(html).toContain("Jane")
    })

    it("should reject javascript: protocol in payment link", () => {
      const html = paymentLinkEmailTemplate(
        participantName, eventTitle, eventEmoji,
        "javascript:alert(document.cookie)",
        expiresAt,
      )

      expect(html).not.toContain("javascript:")
    })

    it("should reject data: protocol in payment link", () => {
      const html = paymentLinkEmailTemplate(
        participantName, eventTitle, eventEmoji,
        "data:text/html,<script>alert(1)</script>",
        expiresAt,
      )

      expect(html).not.toContain("data:text/html")
    })

    it("should allow valid https payment link", () => {
      const html = paymentLinkEmailTemplate(
        participantName, eventTitle, eventEmoji,
        "https://www.asaas.com/c/pay123",
        expiresAt,
      )

      expect(html).toContain("https://www.asaas.com/c/pay123")
    })

    it("should sanitize multiple XSS attempts across all fields", () => {
      const html = paymentLinkEmailTemplate(
        '<script>alert("name")</script>John',
        '<iframe src="https://evil.com">Party</iframe>',
        '<script>alert("emoji")</script>🎉',
        paymentLink, expiresAt,
      )

      expect(html).not.toContain("<script>")
      expect(html).not.toContain("<iframe")
      expect(html).not.toContain("evil.com")
      expect(html).not.toContain('alert(')
    })

    it("should preserve legitimate content after sanitization", () => {
      const html = paymentLinkEmailTemplate(
        "Ana Maria", "Festa de Ano Novo", "🎉",
        paymentLink, expiresAt,
      )

      expect(html).toContain("Ana Maria")
      expect(html).toContain("Festa de Ano Novo")
      expect(html).toContain("🎉")
      expect(html).toContain("Link de pagamento")
    })
  })
})

describe("getPaymentLinkEmailSubject", () => {
  it("should include event title", () => {
    const result = getPaymentLinkEmailSubject("Festa de Ano Novo", "🎉")
    expect(result).toContain("Festa de Ano Novo")
  })

  it("should include emoji when present", () => {
    const result = getPaymentLinkEmailSubject("Festa de Ano Novo", "🎉")
    expect(result).toContain("🎉")
  })

  it("should work without emoji", () => {
    const result = getPaymentLinkEmailSubject("Festa de Ano Novo", null)
    expect(result).toContain("Festa de Ano Novo")
    expect(result).not.toContain("null")
  })

  it("should mention payment", () => {
    const result = getPaymentLinkEmailSubject("Festa de Ano Novo", "🎉")
    expect(result).toMatch(/pagamento/i)
  })
})

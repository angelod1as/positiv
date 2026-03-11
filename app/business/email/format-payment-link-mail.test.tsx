import { describe, expect, it } from "vitest"
import { formatPaymentLinkMail } from "./format-payment-link-mail"

describe("formatPaymentLinkMail", () => {
  const participantName = "Ana Maria"
  const eventTitle = "Festa de Ano Novo"
  const eventEmoji = "🎉"
  const paymentLink = "https://www.asaas.com/c/pay123"
  const expiresAt = new Date("2026-03-13T14:00:00-03:00")

  it("should return both html and text", async () => {
    const result = await formatPaymentLinkMail(
      participantName, eventTitle, eventEmoji, paymentLink, expiresAt,
    )

    expect(result).toHaveProperty("html")
    expect(result).toHaveProperty("text")
    expect(typeof result.html).toBe("string")
    expect(typeof result.text).toBe("string")
  })

  it("should include participant name in html", async () => {
    const result = await formatPaymentLinkMail(
      participantName, eventTitle, eventEmoji, paymentLink, expiresAt,
    )

    expect(result.html).toContain("Ana Maria")
  })

  it("should include event details in html", async () => {
    const result = await formatPaymentLinkMail(
      participantName, eventTitle, eventEmoji, paymentLink, expiresAt,
    )

    expect(result.html).toContain("Festa de Ano Novo")
    expect(result.html).toContain("🎉")
  })

  it("should include payment link in html", async () => {
    const result = await formatPaymentLinkMail(
      participantName, eventTitle, eventEmoji, paymentLink, expiresAt,
    )

    expect(result.html).toContain(paymentLink)
  })

  it("should convert html to plain text", async () => {
    const result = await formatPaymentLinkMail(
      participantName, eventTitle, eventEmoji, paymentLink, expiresAt,
    )

    expect(result.text).toContain("Ana Maria")
    expect(result.text).toContain("Festa de Ano Novo")
    expect(result.text).not.toContain("<html")
    expect(result.text).not.toContain("<body")
  })
})

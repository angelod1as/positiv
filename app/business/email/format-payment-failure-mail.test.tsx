import { describe, expect, it } from "vitest"
import { formatPaymentFailureMail } from "./format-payment-failure-mail"

describe("formatPaymentFailureMail", () => {
  const participantName = "Ana Maria"
  const eventTitle = "Festa de Ano Novo"
  const eventEmoji = "🎉"
  const failureReason = "Cartão recusado pela operadora"
  const paymentLink = "https://pay.example.com/retry/abc123"

  it("should return both html and text", async () => {
    const result = await formatPaymentFailureMail(
      participantName, eventTitle, eventEmoji, failureReason, paymentLink,
    )

    expect(result).toHaveProperty("html")
    expect(result).toHaveProperty("text")
    expect(typeof result.html).toBe("string")
    expect(typeof result.text).toBe("string")
  })

  it("should include participant name in html", async () => {
    const result = await formatPaymentFailureMail(
      participantName, eventTitle, eventEmoji, failureReason, paymentLink,
    )

    expect(result.html).toContain("Ana Maria")
  })

  it("should include event details and failure reason in html", async () => {
    const result = await formatPaymentFailureMail(
      participantName, eventTitle, eventEmoji, failureReason, paymentLink,
    )

    expect(result.html).toContain("Festa de Ano Novo")
    expect(result.html).toContain("🎉")
    expect(result.html).toContain("Cartão recusado pela operadora")
  })

  it("should include payment link in html", async () => {
    const result = await formatPaymentFailureMail(
      participantName, eventTitle, eventEmoji, failureReason, paymentLink,
    )

    expect(result.html).toContain("https://pay.example.com/retry/abc123")
    expect(result.html).toContain("Tentar novamente")
  })

  it("should convert html to plain text", async () => {
    const result = await formatPaymentFailureMail(
      participantName, eventTitle, eventEmoji, failureReason, paymentLink,
    )

    expect(result.text).toContain("Ana Maria")
    expect(result.text).toContain("Festa de Ano Novo")
    expect(result.text).not.toContain("<html")
    expect(result.text).not.toContain("<body")
  })
})

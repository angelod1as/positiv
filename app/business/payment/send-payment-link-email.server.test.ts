import { describe, it, expect, vi } from "vitest"

vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}))

import { sendPaymentLinkEmail } from "./send-payment-link-email.server"
import { sendEmail } from "~/business/email/send-email"

const defaultParams = {
  participantEmail: "joao@test.com",
  participantName: "João Silva",
  eventName: "Positiv Regular",
  ticketPrice: 220,
  paymentUrl: "https://www.positivparty.com/pagamento/abc-123",
  expiresAt: new Date("2026-03-17T12:00:00Z"),
}

describe("sendPaymentLinkEmail", () => {
  it("sends email with correct subject and recipient", async () => {
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      data: undefined,
      errors: [],
    })

    const result = await sendPaymentLinkEmail(defaultParams)

    expect(result.emailSent).toBe(true)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "joao@test.com",
        subject: expect.stringContaining("Positiv Regular"),
      }),
    )
  })

  it("returns emailSent false when sendEmail fails", async () => {
    vi.mocked(sendEmail).mockResolvedValue({
      success: false,
      errors: [{ message: "SMTP error" } as never],
    })

    const result = await sendPaymentLinkEmail(defaultParams)

    expect(result.emailSent).toBe(false)
  })

  it("includes html and text in email options", async () => {
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      data: undefined,
      errors: [],
    })

    await sendPaymentLinkEmail(defaultParams)

    const mailOptions = vi.mocked(sendEmail).mock.calls[0][0]
    expect(mailOptions.html).toContain("João Silva")
    expect(mailOptions.text).toContain("João Silva")
  })
})

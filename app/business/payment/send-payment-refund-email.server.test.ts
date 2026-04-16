import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("~/business/email/format-payment-refund-mail", () => ({
  formatPaymentRefundMail: vi.fn().mockReturnValue({
    html: "<html>refund</html>",
    text: "refund",
  }),
}))

vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import { sendPaymentRefundEmail } from "./send-payment-refund-email.server"
import { sendEmail } from "~/business/email/send-email"

describe("sendPaymentRefundEmail", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sends email with correct subject and returns emailSent: true", async () => {
    const result = await sendPaymentRefundEmail({
      participantEmail: "joao@test.com",
      participantName: "João",
      eventName: "Positiv Regular",
      refundAmount: 220,
    })

    expect(result.emailSent).toBe(true)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "joao@test.com",
        subject: expect.stringContaining("Reembolso"),
      }),
    )
  })

  it("returns emailSent: false when sendEmail fails", async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce({ success: false, errors: [{ message: "fail" } as never] })

    const result = await sendPaymentRefundEmail({
      participantEmail: "joao@test.com",
      participantName: "João",
      eventName: "Positiv Regular",
      refundAmount: 220,
    })

    expect(result.emailSent).toBe(false)
  })
})

import { SendEmailCommand } from "@aws-sdk/client-sesv2"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock("@aws-sdk/client-sesv2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@aws-sdk/client-sesv2")>()),
  SESv2Client: vi.fn(function SESv2Client() {
    return { send }
  }),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    child() {
      return this
    },
  },
}))

// Nodemailer itself is not mocked here: in production every email, payment
// links included, goes through its SES transport, so this pins the contract
// between the real library and the SES client across nodemailer upgrades.
describe("sendEmail in production", () => {
  beforeEach(() => {
    vi.resetModules()
    send.mockReset()
    ENV.APP_ENV = "production"
    ENV.AWS_ACCESS_KEY_ID = "key"
    ENV.AWS_SECRET_ACCESS_KEY = "secret"
  })

  it("hands SES the whole message as one raw email", async () => {
    send.mockResolvedValue({ MessageId: "ses-message-id" })
    const { sendEmail } = await import("./send-email")

    const result = await sendEmail({
      to: "participante@example.com",
      subject: "Seu link de pagamento",
      text: "Pague aqui",
      html: "<p>Pague aqui</p>",
    })

    expect(result.success).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
    const command = send.mock.calls[0][0]
    expect(command).toBeInstanceOf(SendEmailCommand)
    const raw = Buffer.from(command.input.Content.Raw.Data).toString()
    expect(raw).toContain("To: participante@example.com")
    expect(raw).toContain("Subject: Seu link de pagamento")
    expect(raw).toContain("Pague aqui")
  })

  it("fails the send when SES rejects the message", async () => {
    send.mockRejectedValue(new Error("MessageRejected"))
    const { sendEmail } = await import("./send-email")

    const result = await sendEmail({
      to: "participante@example.com",
      subject: "Seu link de pagamento",
      text: "Pague aqui",
      html: "<p>Pague aqui</p>",
    })

    expect(result.success).toBe(false)
  })
})

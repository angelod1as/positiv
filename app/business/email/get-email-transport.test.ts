import { beforeEach, describe, expect, it, vi } from "vitest"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

const { createTransport } = vi.hoisted(() => ({ createTransport: vi.fn() }))
vi.mock("nodemailer", () => ({ default: { createTransport } }))

const { SESv2Client } = vi.hoisted(() => ({ SESv2Client: vi.fn() }))
vi.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client,
  SendEmailCommand: vi.fn(),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

describe("getEmailTransport", () => {
  beforeEach(() => {
    vi.resetModules()
    createTransport.mockReset()
    createTransport.mockReturnValue({})
    SESv2Client.mockReset()
    Object.keys(ENV).forEach((key) => (ENV[key] = undefined))
  })

  it("sends through SES when deployed to production", async () => {
    ENV.APP_ENV = "production"
    ENV.AWS_ACCESS_KEY_ID = "key"
    ENV.AWS_SECRET_ACCESS_KEY = "secret"

    const { getEmailTransport } = await import("./get-email-transport")
    getEmailTransport()

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ SES: expect.anything() }),
    )
  })

  it("sends to the local mail catcher everywhere else", async () => {
    ENV.APP_ENV = "development"
    ENV.AWS_ACCESS_KEY_ID = "key"
    ENV.AWS_SECRET_ACCESS_KEY = "secret"

    const { getEmailTransport } = await import("./get-email-transport")
    getEmailTransport()

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "localhost", port: 54325 }),
    )
  })

  // The runtime image pins NODE_ENV=production, so keying off it would send
  // real email from every container regardless of where it is deployed.
  it("does not reach SES when only NODE_ENV says production", async () => {
    ENV.NODE_ENV = "production"
    ENV.APP_ENV = "test"
    ENV.AWS_ACCESS_KEY_ID = "key"
    ENV.AWS_SECRET_ACCESS_KEY = "secret"

    const { getEmailTransport } = await import("./get-email-transport")
    getEmailTransport()

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "localhost", port: 54325 }),
    )
  })

  // A send is what the payment outbox claims a row for, and the claim is a
  // ten-minute lease. A transport with no timeout can outlive it, and then a
  // second sender takes the row while the first is still going -- so the send
  // is bounded well inside the lease.
  it("bounds a local send so it cannot outlive an outbox claim", async () => {
    ENV.APP_ENV = "development"

    const { getEmailTransport } = await import("./get-email-transport")
    getEmailTransport()

    const options = createTransport.mock.calls[0][0]
    expect(options.connectionTimeout).toBeLessThanOrEqual(60_000)
    expect(options.greetingTimeout).toBeLessThanOrEqual(60_000)
    expect(options.socketTimeout).toBeLessThanOrEqual(60_000)
  })

  it("bounds a production send for the same reason", async () => {
    ENV.APP_ENV = "production"
    ENV.AWS_ACCESS_KEY_ID = "key"
    ENV.AWS_SECRET_ACCESS_KEY = "secret"

    const { getEmailTransport } = await import("./get-email-transport")
    getEmailTransport()

    const config = SESv2Client.mock.calls[0][0]
    expect(config.requestHandler.connectionTimeout).toBeLessThanOrEqual(60_000)
    expect(config.requestHandler.requestTimeout).toBeLessThanOrEqual(60_000)
  })

  it("refuses to build a production transport without credentials", async () => {
    ENV.APP_ENV = "production"

    const { getEmailTransport } = await import("./get-email-transport")

    expect(() => getEmailTransport()).toThrow("Credentials not found")
  })
})

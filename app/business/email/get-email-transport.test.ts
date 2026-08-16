import { beforeEach, describe, expect, it, vi } from "vitest"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

const { createTransport } = vi.hoisted(() => ({ createTransport: vi.fn() }))
vi.mock("nodemailer", () => ({ default: { createTransport } }))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

describe("getEmailTransport", () => {
  beforeEach(() => {
    vi.resetModules()
    createTransport.mockReset()
    createTransport.mockReturnValue({})
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
      expect.objectContaining({ host: "localhost", port: 1025 }),
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
      expect.objectContaining({ host: "localhost", port: 1025 }),
    )
  })

  it("refuses to build a production transport without credentials", async () => {
    ENV.APP_ENV = "production"

    const { getEmailTransport } = await import("./get-email-transport")

    expect(() => getEmailTransport()).toThrow("Credentials not found")
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { baselineEmailTemplates } from "~/business/cms/email-templates.fixture"
import {
  type EmailTemplates,
  emailTemplatesSchema,
} from "~/business/cms/email-templates.schema"
import { logger } from "~/lib/logger/logger.server"
import { EMAIL_COPY_TIMEOUT_MS, loadEmailCopy } from "./email-copy.server"

vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

const templates = emailTemplatesSchema.parse({
  ...baselineEmailTemplates,
  paymentLink: { ...baselineEmailTemplates.paymentLink, subject: "Do Sanity" },
})
const toCopy = (content: EmailTemplates["paymentLink"]) => content.subject
const fallback = "Do código"

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("loadEmailCopy", () => {
  it("picks the copy out of the singleton", async () => {
    const cache = { get: vi.fn(async () => templates) }

    expect(await loadEmailCopy("test", "paymentLink", toCopy, fallback, cache)).toBe("Do Sanity")
  })

  it("falls back when the singleton is missing", async () => {
    const cache = { get: vi.fn(async () => null) }

    expect(await loadEmailCopy("test", "paymentLink", toCopy, fallback, cache)).toBe(fallback)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("falls back, without logging again, when the singleton lacks the email", async () => {
    const cache = {
      get: vi.fn(async () => ({ ...templates, paymentLink: undefined })),
    }

    expect(await loadEmailCopy("test", "paymentLink", toCopy, fallback, cache)).toBe(
      fallback,
    )
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("falls back and logs, naming the email, when the cache cannot load", async () => {
    const cache = { get: vi.fn(async () => Promise.reject(new Error("down"))) }

    expect(await loadEmailCopy("test", "paymentLink", toCopy, fallback, cache)).toBe(fallback)
    expect(logger.error).toHaveBeenCalledWith(
      "Could not load the test email copy, using the default",
      { error: "down" },
    )
  })

  it("falls back when Sanity takes longer than the timeout", async () => {
    vi.useFakeTimers()
    const cache = { get: vi.fn(() => new Promise<never>(() => {})) }

    const copy = loadEmailCopy("test", "paymentLink", toCopy, fallback, cache)
    await vi.advanceTimersByTimeAsync(EMAIL_COPY_TIMEOUT_MS)

    expect(await copy).toBe(fallback)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

const feedback = {
  name: "João Silva",
  email: "joao@example.com",
  whatsapp: "11999999999",
  has_participated: "once" as const,
  feedback_text: "A festa foi ótima",
}

const getSentMessage = (fetchMock: ReturnType<typeof vi.fn>) => {
  const [, init] = fetchMock.mock.calls[0]
  return JSON.parse(init.body as string)
}

describe("notifyNewFeedback", () => {
  beforeEach(() => {
    vi.resetModules()
    Object.keys(ENV).forEach((key) => (ENV[key] = undefined))
    ENV.TELEGRAM_ALERTS_ENABLED = true
    ENV.TELEGRAM_BOT_TOKEN = "bot-token"
    ENV.TELEGRAM_CHAT_ID = "chat-id"
    ENV.APP_URL = "https://positiv.test"
    logger.error.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should send the feedback to the configured Telegram chat", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    const { notifyNewFeedback } = await import("./notify-new-feedback.server")
    await notifyNewFeedback(feedback)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.telegram.org/botbot-token/sendMessage")

    const message = getSentMessage(fetchMock)
    expect(message.chat_id).toBe("chat-id")
    expect(message.text).toContain("João Silva")
    expect(message.text).toContain("A festa foi ótima")
    expect(message.text).toContain("https://positiv.test/admin/feedbacks")
  })

  it("should describe a feedback sent without a name as anonymous", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    const { notifyNewFeedback } = await import("./notify-new-feedback.server")
    await notifyNewFeedback({
      ...feedback,
      name: null,
      email: null,
      whatsapp: null,
    })

    expect(getSentMessage(fetchMock).text).toContain("Anônimo")
  })

  it("should truncate a very long feedback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    const { notifyNewFeedback } = await import("./notify-new-feedback.server")
    await notifyNewFeedback({ ...feedback, feedback_text: "a".repeat(1200) })

    const { text } = getSentMessage(fetchMock)
    expect(text).toContain("…")
    expect(text.length).toBeLessThan(1000)
  })

  it("should not send anything when the bot token is missing", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    ENV.TELEGRAM_BOT_TOKEN = undefined

    const { notifyNewFeedback } = await import("./notify-new-feedback.server")
    await notifyNewFeedback(feedback)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should not send anything when the chat id is missing", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    ENV.TELEGRAM_CHAT_ID = undefined

    const { notifyNewFeedback } = await import("./notify-new-feedback.server")
    await notifyNewFeedback(feedback)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should not send anything when alerts are disabled", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    ENV.TELEGRAM_ALERTS_ENABLED = false

    const { notifyNewFeedback } = await import("./notify-new-feedback.server")
    await notifyNewFeedback(feedback)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("should log and swallow a network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"))
    vi.stubGlobal("fetch", fetchMock)

    const { notifyNewFeedback } = await import("./notify-new-feedback.server")

    await expect(notifyNewFeedback(feedback)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalled()
  })

  it("should log when Telegram rejects the message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 400, text: async () => "bad" })
    vi.stubGlobal("fetch", fetchMock)

    const { notifyNewFeedback } = await import("./notify-new-feedback.server")
    await notifyNewFeedback(feedback)

    expect(logger.error).toHaveBeenCalled()
  })
})

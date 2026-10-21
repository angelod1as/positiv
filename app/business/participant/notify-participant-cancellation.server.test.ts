import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

const { logger } = vi.hoisted(() => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("~/kysely-db", () => ({ kyselyDb: {} }))

const cancellation = {
  eventId: "event-123",
  eventTitle: "Festa de Primavera",
  fullName: "Maria Souza",
  socialName: null,
  email: "maria@example.com",
  phone: "11999999999",
  applicationStatus: "talking" as const,
  cancelledAt: "2026-10-21T22:30:00.000Z",
  reason: null,
  hasPaid: false,
}

const getSentMessage = (fetchMock: ReturnType<typeof vi.fn>) => {
  const [, init] = fetchMock.mock.calls[0]
  return JSON.parse(init.body as string)
}

const loadNotifier = async () =>
  (await import("./notify-participant-cancellation.server"))
    .notifyParticipantCancellation

describe("notifyParticipantCancellation", () => {
  beforeEach(() => {
    vi.resetModules()
    Object.keys(ENV).forEach((key) => (ENV[key] = undefined))
    ENV.TELEGRAM_BOT_TOKEN = "bot-token"
    ENV.TELEGRAM_EDITOR_CHAT_ID = "editor-chat"
    ENV.TELEGRAM_CHAT_ID = "alerts-chat"
    ENV.APP_URL = "https://positiv.test"
    logger.error.mockClear()
    logger.info.mockClear()
    logger.warn.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("sends one message to the editors' chat, not the alerts chat", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.telegram.org/botbot-token/sendMessage")
    expect(getSentMessage(fetchMock).chat_id).toBe("editor-chat")
  })

  it("carries who cancelled, from which event, and how to reach them", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    const { text } = getSentMessage(fetchMock)
    expect(text).toContain("Festa de Primavera")
    expect(text).toContain("Maria Souza")
    expect(text).toContain("maria@example.com")
    expect(text).toContain("11999999999")
  })

  it("shows the social name next to the full name when there is one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )({ ...cancellation, socialName: "Mari" })

    expect(getSentMessage(fetchMock).text).toContain("Maria Souza (Mari)")
  })

  it("names the application status with the admin label", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    expect(getSentMessage(fetchMock).text).toContain("Conversando")
  })

  it("dates the cancellation in São Paulo time", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    expect(getSentMessage(fetchMock).text).toContain("21/10/2026 às 19:30")
  })

  it("links to the event in the admin", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    expect(getSentMessage(fetchMock).text).toContain(
      "https://positiv.test/admin/eventos/event-123",
    )
  })

  it("includes the reason when the participant gave one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )({
      ...cancellation,
      reason: "Vou viajar nesse fim de semana",
    })

    expect(getSentMessage(fetchMock).text).toContain(
      "Motivo: Vou viajar nesse fim de semana",
    )
  })

  it("leaves the reason out when none was given", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    expect(getSentMessage(fetchMock).text).not.toContain("Motivo")
  })

  it("warns that a refund is pending when the registration was paid", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )({ ...cancellation, hasPaid: true })

    expect(getSentMessage(fetchMock).text).toContain(
      "Pago — reembolso pendente no Asaas",
    )
  })

  it("says nothing about a refund when nothing was paid", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    expect(getSentMessage(fetchMock).text).not.toContain("reembolso")
  })

  it("sends even with the technical alerts switched off", async () => {
    ENV.TELEGRAM_ALERTS_ENABLED = false
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("sends nothing when the editors' chat is not configured", async () => {
    ENV.TELEGRAM_EDITOR_CHAT_ID = undefined
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("sends nothing when the bot token is missing", async () => {
    ENV.TELEGRAM_BOT_TOKEN = undefined
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await (
      await loadNotifier()
    )(cancellation)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("logs and swallows a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")))

    await expect((await loadNotifier())(cancellation)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it("logs a message Telegram rejected, without the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400 }),
    )

    await (
      await loadNotifier()
    )(cancellation)

    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("bot-token")
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type winston from "winston"

describe("logger", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("exports a Winston logger instance", async () => {
    const { logger } = await import("./logger.server")
    expect(logger).toBeDefined()
    expect(typeof logger.error).toBe("function")
    expect(typeof logger.warn).toBe("function")
    expect(typeof logger.info).toBe("function")
  })

  it("includes a Console transport", async () => {
    const { logger } = await import("./logger.server")
    const hasConsole = logger.transports.some(
      (t: winston.transport) => t.constructor.name === "Console",
    )
    expect(hasConsole).toBe(true)
  })

  it("does not add Telegram transport when TELEGRAM_ALERTS_ENABLED is not set", async () => {
    const { logger } = await import("./logger.server")
    const hasTelegram = logger.transports.some(
      (t: winston.transport) => t.constructor.name === "TelegramTransport",
    )
    expect(hasTelegram).toBe(false)
  })

  it("adds Telegram transport when enabled with token and chatId", async () => {
    vi.stubEnv("TELEGRAM_ALERTS_ENABLED", "true")
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:ABC")
    vi.stubEnv("TELEGRAM_CHAT_ID", "-100123")

    const { logger } = await import("./logger.server")
    const hasTelegram = logger.transports.some(
      (t: winston.transport) => t.constructor.name === "TelegramTransport",
    )
    expect(hasTelegram).toBe(true)
  })

  it("does not add Telegram transport when enabled but missing token", async () => {
    vi.stubEnv("TELEGRAM_ALERTS_ENABLED", "true")
    vi.stubEnv("TELEGRAM_CHAT_ID", "-100123")

    const { logger } = await import("./logger.server")
    const hasTelegram = logger.transports.some(
      (t: winston.transport) => t.constructor.name === "TelegramTransport",
    )
    expect(hasTelegram).toBe(false)
  })

  it("does not add Telegram transport when enabled but missing chatId", async () => {
    vi.stubEnv("TELEGRAM_ALERTS_ENABLED", "true")
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:ABC")

    const { logger } = await import("./logger.server")
    const hasTelegram = logger.transports.some(
      (t: winston.transport) => t.constructor.name === "TelegramTransport",
    )
    expect(hasTelegram).toBe(false)
  })

  it("sets Telegram transport to error level only", async () => {
    vi.stubEnv("TELEGRAM_ALERTS_ENABLED", "true")
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123:ABC")
    vi.stubEnv("TELEGRAM_CHAT_ID", "-100123")

    const { logger } = await import("./logger.server")
    const telegram = logger.transports.find(
      (t: winston.transport) => t.constructor.name === "TelegramTransport",
    )
    expect(telegram?.level).toBe("error")
  })
})

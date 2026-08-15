import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type winston from "winston"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

describe("logger", () => {
  beforeEach(() => {
    vi.resetModules()
    Object.keys(ENV).forEach((key) => (ENV[key] = undefined))
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
    ENV.TELEGRAM_ALERTS_ENABLED = true
    ENV.TELEGRAM_BOT_TOKEN = "123:ABC"
    ENV.TELEGRAM_CHAT_ID = "-100123"

    const { logger } = await import("./logger.server")
    const hasTelegram = logger.transports.some(
      (t: winston.transport) => t.constructor.name === "TelegramTransport",
    )
    expect(hasTelegram).toBe(true)
  })

  it("does not add Telegram transport when enabled but missing token", async () => {
    ENV.TELEGRAM_ALERTS_ENABLED = true
    ENV.TELEGRAM_CHAT_ID = "-100123"

    const { logger } = await import("./logger.server")
    const hasTelegram = logger.transports.some(
      (t: winston.transport) => t.constructor.name === "TelegramTransport",
    )
    expect(hasTelegram).toBe(false)
  })

  it("does not add Telegram transport when enabled but missing chatId", async () => {
    ENV.TELEGRAM_ALERTS_ENABLED = true
    ENV.TELEGRAM_BOT_TOKEN = "123:ABC"

    const { logger } = await import("./logger.server")
    const hasTelegram = logger.transports.some(
      (t: winston.transport) => t.constructor.name === "TelegramTransport",
    )
    expect(hasTelegram).toBe(false)
  })

  it("sets Telegram transport to error level only", async () => {
    ENV.TELEGRAM_ALERTS_ENABLED = true
    ENV.TELEGRAM_BOT_TOKEN = "123:ABC"
    ENV.TELEGRAM_CHAT_ID = "-100123"

    const { logger } = await import("./logger.server")
    const telegram = logger.transports.find(
      (t: winston.transport) => t.constructor.name === "TelegramTransport",
    )
    expect(telegram?.level).toBe("error")
  })
})

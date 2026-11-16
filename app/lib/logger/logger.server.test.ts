import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type winston from "winston"
import TransportStream from "winston-transport"

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

  it("logs info and above in production", async () => {
    ENV.APP_ENV = "production"

    const { logger } = await import("./logger.server")

    expect(logger.level).toBe("info")
  })

  describe("log files", () => {
    let logDir: string

    beforeEach(async () => {
      logDir = await mkdtemp(join(tmpdir(), "positiv-logs-"))
    })

    afterEach(async () => {
      await rm(logDir, { recursive: true, force: true })
    })

    it("writes nothing to disk when LOG_DIR is not set", async () => {
      const { logger } = await import("./logger.server")
      const hasFile = logger.transports.some(
        (t: winston.transport) => t.constructor.name === "DailyRotateFile",
      )
      expect(hasFile).toBe(false)
    })

    it("writes each entry as a JSON line to a dated file in LOG_DIR", async () => {
      ENV.APP_ENV = "production"
      ENV.LOG_DIR = logDir

      const { logger } = await import("./logger.server")
      logger.info("job finished", { job: "retry-payment-emails" })

      await vi.waitFor(async () => {
        const [file] = await readdir(logDir).then((names) =>
          names.filter((name) => name.endsWith(".log")),
        )
        expect(file).toMatch(/^positiv-\d{4}-\d{2}-\d{2}\.log$/)
        const [line] = (await readFile(join(logDir, file), "utf8"))
          .trim()
          .split("\n")
        expect(JSON.parse(line)).toMatchObject({
          level: "info",
          message: "job finished",
          job: "retry-payment-emails",
          timestamp: expect.any(String),
        })
      })
    })

    it("keeps 60 days of files capped at 20 MB each", async () => {
      ENV.LOG_DIR = logDir

      const { logger } = await import("./logger.server")
      const file = logger.transports.find(
        (t: winston.transport) => t.constructor.name === "DailyRotateFile",
      ) as (winston.transport & { options: Record<string, unknown> }) | undefined

      expect(file?.options).toMatchObject({ maxFiles: "60d", maxSize: "20m" })
    })
  })

  describe("incident ID", () => {
    class CaptureTransport extends TransportStream {
      entries: Record<string, unknown>[] = []
      log(info: Record<string, unknown>, callback: () => void) {
        this.entries.push(info)
        callback()
      }
    }

    async function capture() {
      const { logger } = await import("./logger.server")
      const console = new CaptureTransport()
      const telegram = new CaptureTransport()
      logger.add(console)
      logger.add(telegram)
      return { logger, console, telegram }
    }

    it("stamps every error entry with a short hex incident ID", async () => {
      const { logger, console } = await capture()

      logger.error("boom")

      expect(console.entries[0].incidentId).toMatch(/^[0-9a-f]{8}$/)
    })

    it("hands every transport the same incident ID", async () => {
      const { logger, console, telegram } = await capture()

      logger.error("boom")

      expect(telegram.entries[0].incidentId).toBe(console.entries[0].incidentId)
    })

    it("gives each error its own incident ID", async () => {
      const { logger, console } = await capture()

      logger.error("first")
      logger.error("second")

      expect(console.entries[0].incidentId).not.toBe(
        console.entries[1].incidentId,
      )
    })

    it("leaves warnings without one", async () => {
      const { logger, console } = await capture()

      logger.warn("careful")

      expect(console.entries[0]).not.toHaveProperty("incidentId")
    })
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TelegramTransport } from "./telegram-transport.server"

const BOT_TOKEN = "123456:ABC-DEF"
const CHAT_ID = "-1001234567890"

describe("TelegramTransport", () => {
  let transport: TelegramTransport
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchSpy)
    transport = new TelegramTransport({ botToken: BOT_TOKEN, chatId: CHAT_ID })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sends a POST to the Telegram Bot API with HTML formatting", () => {
    return new Promise<void>((resolve) => {
      transport.log({ level: "error", message: "Server crashed" }, () => {
        expect(fetchSpy).toHaveBeenCalledTimes(1)
        const [url, options] = fetchSpy.mock.calls[0]
        expect(url).toBe(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        )
        expect(options.method).toBe("POST")
        expect(options.headers["Content-Type"]).toBe("application/json")
        const body = JSON.parse(options.body)
        expect(body.chat_id).toBe(CHAT_ID)
        expect(body.parse_mode).toBe("HTML")
        expect(body.text).toContain("Server crashed")
        resolve()
      })
    })
  })

  it("escapes HTML special characters in the message", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        { level: "error", message: '<script>alert("xss")</script>' },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          expect(body.text).not.toContain("<script>")
          expect(body.text).toContain("&lt;script&gt;")
          resolve()
        },
      )
    })
  })

  it("truncates messages longer than 4096 characters", () => {
    return new Promise<void>((resolve) => {
      const longMessage = "x".repeat(5000)
      transport.log({ level: "error", message: longMessage }, () => {
        const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
        expect(body.text.length).toBeLessThanOrEqual(4096)
        resolve()
      })
    })
  })

  it("rate-limits messages using token bucket (5 burst, 1/sec refill)", () => {
    return new Promise<void>((resolve) => {
      let completed = 0
      const total = 7

      for (let i = 0; i < total; i++) {
        transport.log({ level: "error", message: `msg-${i}` }, () => {
          completed++
          if (completed === total) {
            expect(fetchSpy).toHaveBeenCalledTimes(5)
            resolve()
          }
        })
      }
    })
  })

  it("always calls the callback even on network errors", () => {
    fetchSpy.mockRejectedValue(new Error("Network failure"))
    return new Promise<void>((resolve) => {
      transport.log({ level: "error", message: "test" }, () => {
        resolve()
      })
    })
  })

  it("does not throw on network errors (silent failure)", () => {
    fetchSpy.mockRejectedValue(new Error("Network failure"))
    return new Promise<void>((resolve) => {
      transport.log({ level: "error", message: "test" }, () => {
        expect(fetchSpy).toHaveBeenCalledTimes(1)
        resolve()
      })
    })
  })

  it("includes the log level in the formatted message", () => {
    return new Promise<void>((resolve) => {
      transport.log({ level: "error", message: "disk full" }, () => {
        const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
        expect(body.text.toLowerCase()).toContain("error")
        resolve()
      })
    })
  })

  it("includes metadata object in the message text", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        { level: "error", message: "Event failed", eventId: "evt-123", userId: 42 },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          expect(body.text).toContain("eventId")
          expect(body.text).toContain("evt-123")
          expect(body.text).toContain("userId")
          expect(body.text).toContain("42")
          expect(body.text).toContain("<pre>")
          resolve()
        },
      )
    })
  })

  it("includes Error stack trace in metadata", () => {
    return new Promise<void>((resolve) => {
      const error = new Error("connection refused")
      transport.log(
        { level: "error", message: "DB error", error },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          expect(body.text).toContain("connection refused")
          expect(body.text).toContain("stack")
          resolve()
        },
      )
    })
  })

  it("escapes HTML in metadata values", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        { level: "error", message: "bad input", payload: "<img src=x onerror=alert(1)>" },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          expect(body.text).not.toContain("<img")
          expect(body.text).toContain("&lt;img")
          resolve()
        },
      )
    })
  })

  it("truncates message with metadata to 4096 characters", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        { level: "error", message: "fail", bigField: "y".repeat(5000) },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          expect(body.text.length).toBeLessThanOrEqual(4096)
          resolve()
        },
      )
    })
  })
})

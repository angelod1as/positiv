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

  it("renders links as clickable anchors outside the preformatted block", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        {
          level: "error",
          message: "Could not create the charge",
          paymentId: "pay-1",
          links: {
            admin: "https://positiv.test/admin/eventos/e1/participantes/p1",
            asaasCustomer: "https://www.asaas.com/customerAccount/show/cus_1",
          },
        },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          const [beforePre, pre] = body.text.split("<pre>")
          expect(beforePre).toContain(
            '<a href="https://positiv.test/admin/eventos/e1/participantes/p1">admin</a>',
          )
          expect(beforePre).toContain(
            '<a href="https://www.asaas.com/customerAccount/show/cus_1">asaasCustomer</a>',
          )
          expect(pre).toContain("pay-1")
          expect(pre).not.toContain("links")
          resolve()
        },
      )
    })
  })

  it("escapes a link so it cannot break out of the anchor", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        {
          level: "error",
          message: "Boom",
          links: { admin: 'https://x.test/"><b>owned</b>' },
        },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          expect(body.text).not.toContain("<b>owned</b>")
          expect(body.text).toContain(
            '<a href="https://x.test/&quot;&gt;&lt;b&gt;owned&lt;/b&gt;">admin</a>',
          )
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

  it("rate limiter preserves fractional elapsed time across refills", () => {
    return new Promise<void>((resolve) => {
      vi.useFakeTimers()

      const freshTransport = new TelegramTransport({ botToken: BOT_TOKEN, chatId: CHAT_ID })

      // Exhaust all 5 tokens
      const noop = () => {}
      for (let i = 0; i < 5; i++) {
        freshTransport.log({ level: "error", message: `burst-${i}` }, noop)
      }

      // Advance 1500ms — should refill 1 token with 500ms remainder preserved
      vi.advanceTimersByTime(1500)

      freshTransport.log({ level: "error", message: "after-1500" }, noop)

      // Only 500ms more needed (not 1000ms) because 500ms remainder was preserved
      vi.advanceTimersByTime(500)

      freshTransport.log({ level: "error", message: "after-500-more" }, () => {
        // 5 burst + 1 after 1500ms + 1 after 500ms more = 7 fetch calls
        expect(fetchSpy).toHaveBeenCalledTimes(7)
        vi.useRealTimers()
        resolve()
      })
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

  it("emits 'logged' event after sending", () => {
    return new Promise<void>((resolve) => {
      transport.on('logged', (info) => {
        expect(info.message).toBe("emit test")
        resolve()
      })
      transport.log({ level: "error", message: "emit test" }, () => {})
    })
  })

  it("emits 'logged' event even when rate-limited", () => {
    return new Promise<void>((resolve) => {
      const loggedMessages: string[] = []
      transport.on("logged", (info) => {
        loggedMessages.push(info.message)
      })

      let completed = 0
      const total = 7

      for (let i = 0; i < total; i++) {
        transport.log({ level: "error", message: `msg-${i}` }, () => {
          completed++
          if (completed === total) {
            expect(fetchSpy).toHaveBeenCalledTimes(5)
            expect(loggedMessages).toHaveLength(7)
            expect(loggedMessages).toContain("msg-5")
            expect(loggedMessages).toContain("msg-6")
            resolve()
          }
        })
      }
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

  it("does not throw on a circular metadata object", () => {
    return new Promise<void>((resolve) => {
      const circular: Record<string, unknown> = { name: "axios-ish" }
      circular.self = circular
      transport.log(
        { level: "error", message: "boom", cause: circular },
        () => {
          expect(fetchSpy).toHaveBeenCalledTimes(1)
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          expect(body.text).toContain("[Circular]")
          resolve()
        },
      )
    })
  })

  it("truncates long metadata without breaking the anchors or the preformatted block", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        {
          level: "error",
          message: "Could not create the charge",
          stack: "y".repeat(5000),
          links: {
            admin: "https://positiv.test/admin/eventos/e1/participantes/p1",
            asaasCustomer: "https://www.asaas.com/customerAccount/show/cus_1",
          },
        },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          const text: string = body.text
          expect(text.length).toBeLessThanOrEqual(4096)
          expect(text).toContain("Could not create the charge")
          const [beforePre] = text.split("<pre>")
          expect(beforePre).toContain(
            '<a href="https://positiv.test/admin/eventos/e1/participantes/p1">admin</a>',
          )
          expect(beforePre).toContain(
            '<a href="https://www.asaas.com/customerAccount/show/cus_1">asaasCustomer</a>',
          )
          expect(text.match(/<pre>/g)).toHaveLength(1)
          expect(text.match(/<\/pre>/g)).toHaveLength(1)
          expect(text.endsWith("...</pre>")).toBe(true)
          resolve()
        },
      )
    })
  })

  it("never cuts the metadata inside an HTML entity", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        { level: "error", message: "fail", payload: "&<>".repeat(2000) },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          const text: string = body.text
          expect(text.length).toBeLessThanOrEqual(4096)
          expect(text.endsWith("...</pre>")).toBe(true)
          const pre = text.slice(text.indexOf("<pre>") + 5, text.indexOf("</pre>"))
          expect(pre.replace(/&(amp|lt|gt);/g, "")).not.toMatch(/[&<>]/)
          resolve()
        },
      )
    })
  })

  it("truncates a long message without losing the metadata", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        { level: "error", message: "x".repeat(5000), paymentId: "pay-1" },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          const text: string = body.text
          expect(text.length).toBeLessThanOrEqual(4096)
          expect(text.startsWith("<b>[ERROR]</b>\nxxx")).toBe(true)
          expect(text).toContain("x...\n<pre>")
          expect(text).toContain("pay-1")
          expect(text.endsWith("</pre>")).toBe(true)
          resolve()
        },
      )
    })
  })

  it("drops the preformatted block when too little room is left to say anything", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        {
          level: "error",
          message: "Boom",
          paymentId: "pay-1",
          links: { admin: `https://x.test/${"a".repeat(4024)}` },
        },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          const text: string = body.text
          expect(text.length).toBeLessThanOrEqual(4096)
          expect(text).toContain("Boom")
          expect(text).toContain(">admin</a>")
          expect(text).not.toContain("<pre>")
          resolve()
        },
      )
    })
  })

  it("drops the anchors that do not fit instead of going over the limit", () => {
    return new Promise<void>((resolve) => {
      transport.log(
        {
          level: "error",
          message: "Boom",
          links: {
            admin: `https://x.test/${"a".repeat(5000)}`,
            asaasCustomer: "https://www.asaas.com/customerAccount/show/cus_1",
          },
        },
        () => {
          const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
          const text: string = body.text
          expect(text.length).toBeLessThanOrEqual(4096)
          expect(text).not.toContain(">admin</a>")
          expect(text).toContain(
            '<a href="https://www.asaas.com/customerAccount/show/cus_1">asaasCustomer</a>',
          )
          expect(text).toContain("Boom")
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

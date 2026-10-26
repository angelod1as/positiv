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
          expect(text).toMatch(/x\.\.\.\n\d{4}-\d{2}-\d{2} [^\n]+ BRT\n<pre>/)
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
          links: { admin: `https://x.test/${"a".repeat(3985)}` },
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

  describe("a burst of the same error", () => {
    const SENT = { ok: true, result: { message_id: 77 } }

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2026-10-26T14:02:00.000Z"))
      fetchSpy.mockResolvedValue({ ok: true, json: async () => SENT })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    function unhandled(id: string, message = "Bad Request") {
      return {
        level: "error",
        message: `POST /pagamento/${id} rejected with 400 before the action ran`,
        category: "unhandled",
        area: "pagamento",
        request: { method: "POST", path: `/pagamento/${id}`, params: { id } },
        error: { name: "Error", message },
      }
    }

    function log(info: { level: string; message: string; [key: string]: unknown }) {
      return new Promise<void>((resolve) => transport.log(info, resolve))
    }

    function calls(method: string) {
      return fetchSpy.mock.calls
        .filter(([url]) => String(url).endsWith(`/${method}`))
        .map(([, options]) => JSON.parse(options.body))
    }

    async function burst(count: number, everyMs: number) {
      for (let i = 0; i < count; i++) {
        await log(unhandled(`pay-${i}`))
        await vi.advanceTimersByTimeAsync(everyMs)
      }
      await vi.advanceTimersByTimeAsync(60_000)
    }

    it("sends one alert and edits the count into it", async () => {
      await burst(6, 30_000)

      expect(calls("sendMessage")).toHaveLength(1)
      const edits = calls("editMessageText")
      expect(edits.length).toBeGreaterThan(0)
      for (const edit of edits) {
        expect(edit).toMatchObject({
          chat_id: CHAT_ID,
          message_id: 77,
          parse_mode: "HTML",
        })
      }
      expect(edits.at(-1).text).toContain(
        "rejected with 400 before the action ran",
      )
    })

    it("puts the repetition in bold right under the header", async () => {
      await burst(6, 30_000)

      const [header, repetition] = calls("editMessageText")
        .at(-1)
        .text.split("\n")
      expect(header).toBe("<b>[ERROR · unhandled · pagamento]</b>")
      expect(repetition).toBe(
        "<b>🔁 Repeated 6× in 3 min (last 11:04:30 BRT)</b>",
      )
    })

    it("counts in seconds for a short burst", async () => {
      await burst(3, 1_000)

      expect(calls("editMessageText").at(-1).text).toContain(
        "<b>🔁 Repeated 3× in 2s",
      )
    })

    it("sends a different message as its own alert", async () => {
      await log(unhandled("pay-1"))
      await log(unhandled("pay-1", "Something else"))

      expect(calls("sendMessage")).toHaveLength(2)
    })

    it("sends a different route as its own alert", async () => {
      await log(unhandled("pay-1"))
      await log({
        ...unhandled("pay-1"),
        request: { method: "POST", path: "/eventos/pay-1", params: { id: "pay-1" } },
      })

      expect(calls("sendMessage")).toHaveLength(2)
    })

    it("starts a new alert once the window has passed", async () => {
      await log(unhandled("pay-1"))
      await vi.advanceTimersByTimeAsync(5 * 60_000)
      await log(unhandled("pay-2"))

      expect(calls("sendMessage")).toHaveLength(2)
      expect(calls("editMessageText")).toHaveLength(0)
    })

    it("sends the count as a new alert when the first one never got an id", async () => {
      fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ ok: false }) })

      await burst(4, 1_000)

      const sent = calls("sendMessage")
      expect(sent).toHaveLength(2)
      expect(sent[1].text).toContain("<b>🔁 Repeated 4× in 3s")
      expect(sent[1].text).toContain("rejected with 400 before the action ran")
      expect(calls("editMessageText")).toHaveLength(0)
    })

    it("shows the count during a storm that never pauses", async () => {
      for (let i = 0; i < 14; i++) {
        await log(unhandled(`pay-${i}`))
        await vi.advanceTimersByTimeAsync(5_000)
      }

      expect(calls("editMessageText").length).toBeGreaterThan(0)
    })

    it.each([
      ["Telegram refuses it", { ok: true, json: async () => ({ ok: false }) }],
      ["the request fails", { ok: false, json: async () => ({ ok: false }) }],
    ])("sends the count as a new alert when %s", async (_, refusal) => {
      fetchSpy.mockImplementation(async (url: string) =>
        url.endsWith("/editMessageText") ? refusal : { ok: true, json: async () => SENT },
      )

      await burst(3, 1_000)

      const sent = calls("sendMessage")
      expect(sent).toHaveLength(2)
      expect(sent[1].text).toContain("<b>🔁 Repeated 3× in 2s")
    })

    it("does not spend the rate limit on repeats", async () => {
      for (let i = 0; i < 10; i++) await log(unhandled(`pay-${i}`))
      for (let i = 0; i < 4; i++) await log(unhandled("pay-1", `other-${i}`))

      expect(calls("sendMessage")).toHaveLength(5)
    })

    it("keeps an edited alert within Telegram's limit", async () => {
      const long = { ...unhandled("pay-1"), detail: "d".repeat(5000) }
      await log(long)
      await log(long)
      await vi.advanceTimersByTimeAsync(60_000)

      const [edit] = calls("editMessageText")
      expect(edit.text.length).toBeLessThanOrEqual(4096)
      expect(edit.text.match(/<pre>/g)).toHaveLength(1)
      expect(edit.text.match(/<\/pre>/g)).toHaveLength(1)
    })
  })

  describe("alert context", () => {
    function send(info: Record<string, unknown>): Promise<string> {
      return new Promise((resolve) => {
        transport.log({ level: "error", message: "Boom", ...info }, () => {
          resolve(JSON.parse(fetchSpy.mock.calls[0][1].body).text)
        })
      })
    }

    const cwd = process.cwd()
    const stack = [
      "TypeError: Cannot read properties of undefined (reading 'id')",
      "    at node:internal/process/task_queues:105:5",
      `    at loadEvent (${cwd}/app/business/events.server.ts:42:7)`,
      `    at ${cwd}/node_modules/react-router/dist/index.js:900:12`,
      `    at loader (${cwd}/app/pages/events/event-page.tsx:18:3)`,
      `    at file://${cwd}/app/root.tsx:235:5`,
      `    at render (${cwd}/app/entry.server.tsx:60:1)`,
    ].join("\n")

    it("shows the category and area in the header", async () => {
      const text = await send({ category: "unhandled", area: "convite" })

      expect(text.startsWith("<b>[ERROR · unhandled · convite]</b>\nBoom")).toBe(
        true,
      )
    })

    it("shows a category on its own", async () => {
      const text = await send({ category: "payments" })

      expect(text.startsWith("<b>[ERROR · payments]</b>")).toBe(true)
    })

    it("escapes the category", async () => {
      const text = await send({ category: "<b>x</b>" })

      expect(text).toContain("[ERROR · &lt;b&gt;x&lt;/b&gt;]")
    })

    it("caps an oversized area so the alert still fits", async () => {
      const text = await send({
        category: "unhandled",
        area: "a".repeat(5000),
        paymentId: "pay-1",
      })

      expect(text.length).toBeLessThanOrEqual(4096)
      expect(text).toMatch(/^<b>\[ERROR · unhandled · a+\.\.\.\]<\/b>\nBoom/)
      expect(text).toContain("pay-1")
    })

    it("shows the time in UTC and in São Paulo", async () => {
      const text = await send({ timestamp: "2026-10-21T16:30:05.000Z" })

      expect(text).toContain(
        "2026-10-21 16:30:05 UTC · 2026-10-21 13:30:05 BRT",
      )
    })

    it("shows the time even without a timestamp", async () => {
      const text = await send({})

      expect(text).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC/)
    })

    it("shows the incident ID", async () => {
      const text = await send({ incidentId: "a1b2c3d4" })

      expect(text).toContain("\nid a1b2c3d4")
      expect(text).not.toContain('"incidentId"')
    })

    it("shows the error class and code", async () => {
      const text = await send({
        error: { name: "PostgrestError", code: "23505", message: "dup" },
      })

      expect(text).toContain("\nPostgrestError 23505\n")
    })

    it("shows a status when the error has no code", async () => {
      const text = await send({
        error: { name: "Response", status: 500, message: "Response 500" },
      })

      expect(text).toContain("\nResponse 500\n")
    })

    it("shows the request above the preformatted block, not inside it", async () => {
      const text = await send({
        request: { method: "GET", path: "/convite/***", userAgent: "Chrome" },
      })

      const [beforePre] = text.split("<pre>")
      expect(beforePre).toContain("\nGET /convite/*** · Chrome")
      expect(text).not.toContain('"request"')
    })

    it("shows the first three app frames as where it came from", async () => {
      const text = await send({ error: { name: "TypeError", message: "x", stack } })

      expect(text).toContain(
        "\nwhere: app/business/events.server.ts:42 ← app/pages/events/event-page.tsx:18 ← app/root.tsx:235\n",
      )
      expect(text).not.toContain("where: node:")
      expect(text).not.toContain("entry.server.tsx:60 ←")
    })

    it("finds the frames in the cause when the error has no stack", async () => {
      const text = await send({
        error: { name: "Object", message: "x", cause: { message: "y", stack } },
      })

      expect(text).toContain("where: app/business/events.server.ts:42")
    })

    describe("a stack that points only into node_modules", () => {
      const frameworkStack = [
        "Error: Bad Request",
        `    at singleFetchAction (${cwd}/node_modules/react-router/dist/development/chunk-H4DAEOV7.mjs:867:31)`,
        "    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)",
      ].join("\n")

      it("says there is no app frame", async () => {
        const text = await send({
          error: { name: "Error", message: "Bad Request", stack: frameworkStack },
        })

        expect(text).toContain("\nwhere: no app frame (framework)\n")
      })

      it("leaves the stack out of the preformatted block", async () => {
        const text = await send({
          error: { name: "Error", message: "Bad Request", stack: frameworkStack },
        })

        const [, pre] = text.split("<pre>")
        expect(pre).toContain('"message": "Bad Request"')
        expect(pre).not.toContain("chunk-H4DAEOV7")
      })

      it("leaves it out of a cause too, keeping an app stack", async () => {
        const text = await send({
          error: {
            name: "Error",
            message: "outer",
            stack,
            cause: { name: "Error", message: "inner", stack: frameworkStack },
          },
        })

        const [, pre] = text.split("<pre>")
        expect(pre).toContain("events.server.ts:42")
        expect(pre).toContain('"message": "inner"')
        expect(pre).not.toContain("chunk-H4DAEOV7")
      })
    })

    it("keeps the context and a valid message when everything is long", async () => {
      const text = await send({
        message: "m".repeat(5000),
        category: "unhandled",
        area: "convite",
        incidentId: "a1b2c3d4",
        timestamp: "2026-10-21T16:30:05.000Z",
        request: { method: "POST", path: `/${"p".repeat(5000)}`, userAgent: "Chrome" },
        error: { name: "TypeError", message: "e".repeat(5000), stack },
        links: { admin: "https://positiv.test/admin" },
      })

      expect(text.length).toBeLessThanOrEqual(4096)
      expect(text.startsWith("<b>[ERROR · unhandled · convite]</b>")).toBe(true)
      expect(text).toContain("\nid a1b2c3d4")
      expect(text).toContain("where: app/business/events.server.ts:42")
      expect(text).toContain('<a href="https://positiv.test/admin">admin</a>')
      expect(text.match(/<pre>/g)).toHaveLength(1)
      expect(text.match(/<\/pre>/g)).toHaveLength(1)
    })
  })
})

import TransportStream from "winston-transport"

interface TelegramTransportOptions extends TransportStream.TransportStreamOptions {
  botToken: string
  chatId: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

const MAX_MESSAGE_LENGTH = 4096
const ELLIPSIS = "..."

// Cut between whole characters, never inside an entity, so the result is
// always valid inside the HTML around it.
function escapeHtmlWithin(text: string, max: number): string {
  const escaped = escapeHtml(text)
  if (escaped.length <= max) return escaped
  if (max < ELLIPSIS.length) return ""
  let result = ""
  for (const char of text) {
    const piece = escapeHtml(char)
    if (result.length + piece.length > max - ELLIPSIS.length) break
    result += piece
  }
  return result + ELLIPSIS
}

// Log metadata can hold a circular object (an axios error, say), and this runs
// on the error path, which must not throw — so drop circular references.
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>()
  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]"
        seen.add(val)
      }
      return val
    },
    2,
  )
}

export class TelegramTransport extends TransportStream {
  private botToken: string
  private chatId: string
  private tokens: number
  private maxTokens: number
  private refillRate: number
  private lastRefill: number

  constructor(opts: TelegramTransportOptions) {
    super(opts)
    this.botToken = opts.botToken
    this.chatId = opts.chatId
    this.maxTokens = 5
    this.tokens = this.maxTokens
    this.refillRate = 1000
    this.lastRefill = Date.now()
  }

  private refillTokens(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const newTokens = Math.floor(elapsed / this.refillRate)
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens)
      this.lastRefill += newTokens * this.refillRate
    }
  }

  log(
    info: { level: string; message: string; [key: string]: unknown },
    callback: () => void,
  ): void {
    this.refillTokens()

    if (this.tokens <= 0) {
      this.emit("logged", info)
      callback()
      return
    }

    this.tokens--

    const level = escapeHtml(info.level).toUpperCase()
    const head = `<b>[${level}]</b>\n`
    let anchors = ""

    // Telegram does not link a URL inside <pre>, so links go above it as
    // anchors: an alert is read on a phone, and copying a URL out of a code
    // block there is the step nobody takes.
    const links = info.links
    if (typeof links === "object" && links !== null) {
      for (const [label, href] of Object.entries(links)) {
        if (typeof href !== "string") continue
        const attribute = escapeHtml(href).replace(/"/g, "&quot;")
        const anchor = `\n<a href="${attribute}">${escapeHtml(label)}</a>`
        if (head.length + anchors.length + anchor.length > MAX_MESSAGE_LENGTH) continue
        anchors += anchor
      }
    }

    const skipKeys = new Set(["level", "message", "links"])
    const metadata: Record<string, unknown> = {}
    for (const key of Object.keys(info)) {
      if (skipKeys.has(key)) continue
      const value = info[key]
      if (value instanceof Error) {
        metadata[key] = { message: value.message, stack: value.stack }
      } else {
        metadata[key] = value
      }
    }

    // Telegram rejects the whole message when its HTML does not parse, so the
    // content is cut before the tags go around it: metadata first, then the
    // message, and never the anchors.
    const rawMessage = String(info.message)
    const preTags = "\n<pre></pre>"
    let pre = ""
    if (Object.keys(metadata).length > 0) {
      const budget =
        MAX_MESSAGE_LENGTH -
        head.length -
        anchors.length -
        preTags.length -
        escapeHtml(rawMessage).length
      const serialized = escapeHtmlWithin(safeStringify(metadata), budget)
      if (serialized.length > 0) pre = `\n<pre>${serialized}</pre>`
    }

    const message = escapeHtmlWithin(
      rawMessage,
      MAX_MESSAGE_LENGTH - head.length - anchors.length - pre.length,
    )
    const text = `${head}${message}${anchors}${pre}`

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`
    const body = JSON.stringify({
      chat_id: this.chatId,
      parse_mode: "HTML",
      text,
    })

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .catch(() => {})
      .finally(() => {
        this.emit('logged', info)
        callback()
      })
  }
}

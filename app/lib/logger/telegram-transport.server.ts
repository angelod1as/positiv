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
      callback()
      return
    }

    this.tokens--

    const level = escapeHtml(info.level).toUpperCase()
    const message = escapeHtml(String(info.message))
    let text = `<b>[${level}]</b>\n${message}`

    const skipKeys = new Set(["level", "message"])
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

    if (Object.keys(metadata).length > 0) {
      const serialized = escapeHtml(JSON.stringify(metadata, null, 2))
      text += `\n<pre>${serialized}</pre>`
    }

    if (text.length > 4096) {
      text = text.slice(0, 4093) + "..."
    }

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

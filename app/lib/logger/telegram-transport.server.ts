import TransportStream from "winston-transport"
import { appFrames } from "./stack-frames.server"

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
const MIN_METADATA_LENGTH = 500

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

const MAX_CONTEXT_LINE_LENGTH = 300
const MAX_LABEL_LENGTH = 100
const WHERE_FRAMES = 3

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function formatTime(timestamp: unknown): string {
  const parsed = typeof timestamp === "string" ? new Date(timestamp) : null
  const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()
  const utc = date.toISOString().slice(0, 19).replace("T", " ")
  // sv-SE formats as "YYYY-MM-DD HH:mm:ss", the same shape as the UTC part.
  const brt = date.toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" })
  return `${utc} UTC · ${brt} BRT`
}

function errorClass(error: unknown): string | null {
  if (!isRecord(error) || typeof error.name !== "string") return null
  const detail = error.code ?? error.status
  return detail === undefined ? error.name : `${error.name} ${String(detail)}`
}

function describeRequest(request: unknown): string | null {
  if (!isRecord(request)) return null
  const parts = [request.method, request.path].filter(
    (part) => typeof part === "string",
  )
  if (parts.length === 0) return null
  const userAgent =
    typeof request.userAgent === "string" ? ` · ${request.userAgent}` : ""
  return `${parts.join(" ")}${userAgent}`
}

function where(error: unknown): string | null {
  let current = error
  while (isRecord(current) && typeof current.stack !== "string") {
    current = current.cause
  }
  if (!isRecord(current) || typeof current.stack !== "string") return null
  const frames = appFrames(current.stack).slice(0, WHERE_FRAMES)
  return frames.length > 0 ? `where: ${frames.join(" ← ")}` : null
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

    const label = [info.level.toUpperCase(), info.category, info.area]
      .filter((part) => typeof part === "string" && part.length > 0)
      .join(" · ")
    const head = `<b>[${escapeHtmlWithin(label, MAX_LABEL_LENGTH)}]</b>\n`
    const context = [
      errorClass(info.error),
      formatTime(info.timestamp),
      typeof info.incidentId === "string" ? `id ${info.incidentId}` : null,
      describeRequest(info.request),
      where(info.error),
    ]
      .filter((line) => line !== null)
      .map((line) => `\n${escapeHtmlWithin(line, MAX_CONTEXT_LINE_LENGTH)}`)
      .join("")
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
        if (
          head.length + context.length + anchors.length + anchor.length >
          MAX_MESSAGE_LENGTH
        )
          continue
        anchors += anchor
      }
    }

    const skipKeys = new Set([
      "level",
      "message",
      "links",
      "category",
      "area",
      "incidentId",
      "timestamp",
      "request",
    ])
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
    // content is cut before the tags go around it: metadata first, down to a
    // floor that still identifies the alert, then the message, and never the
    // anchors. Below that floor the metadata block says nothing and is dropped.
    const available =
      MAX_MESSAGE_LENGTH - head.length - context.length - anchors.length
    const preTags = "\n<pre></pre>"
    const serialized =
      Object.keys(metadata).length > 0 ? safeStringify(metadata) : ""
    const metadataFloor =
      serialized.length > 0
        ? preTags.length +
          Math.min(escapeHtml(serialized).length, MIN_METADATA_LENGTH)
        : 0
    const keepsMetadata = serialized.length > 0 && available >= metadataFloor

    const message = escapeHtmlWithin(
      String(info.message),
      available - (keepsMetadata ? metadataFloor : 0),
    )
    const pre = keepsMetadata
      ? `\n<pre>${escapeHtmlWithin(serialized, available - message.length - preTags.length)}</pre>`
      : ""
    const text = `${head}${message}${context}${anchors}${pre}`

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

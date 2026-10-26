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
const BURST_WINDOW_MS = 5 * 60_000
const EDIT_DELAY_MS = 10_000
const MAX_EDIT_WAIT_MS = 60_000
const MAX_CAUSE_DEPTH = 5

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
  return frames.length > 0
    ? `where: ${frames.join(" ← ")}`
    : "where: no app frame (framework)"
}

// A stack that points only into node_modules is noise in a chat message; the
// console line keeps it.
function withoutFrameworkStack(value: unknown, depth = 0): unknown {
  if (!isRecord(value) || Array.isArray(value)) return value
  if (!("stack" in value) && !("cause" in value)) return value
  const copy: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (
      key === "stack" &&
      typeof item === "string" &&
      appFrames(item).length === 0
    )
      continue
    copy[key] =
      key === "cause" && depth < MAX_CAUSE_DEPTH
        ? withoutFrameworkStack(item, depth + 1)
        : item
  }
  return copy
}

interface Burst {
  count: number
  firstAt: number
  lastAt: number
  render: (repetition: string) => string
  messageId?: number
  timer?: ReturnType<typeof setTimeout>
  editBy?: number
}

function routePattern(request: Record<string, unknown>): string | null {
  if (typeof request.path !== "string") return null
  const params = isRecord(request.params) ? request.params : {}
  const names = new Map<string, string>()
  for (const [name, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) names.set(value, name)
  }
  return request.path
    .split("/")
    .map((segment) => {
      const name = names.get(segment)
      return name === undefined ? segment : `:${name}`
    })
    .join("/")
}

// The same error on the same route, whatever the ids in its path, is one
// burst: POS-666 sent six identical alerts in a few minutes.
function burstKey(info: Record<string, unknown>): string {
  const request = isRecord(info.request) ? info.request : {}
  const error = isRecord(info.error) ? info.error : {}
  return JSON.stringify([
    info.level,
    info.category,
    request.method,
    routePattern(request),
    error.name,
    typeof error.message === "string" ? error.message : info.message,
  ])
}

function repeatLine(burst: Burst): string {
  const seconds = Math.round((burst.lastAt - burst.firstAt) / 1000)
  const span = seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)} min`
  const last = new Date(burst.lastAt).toLocaleTimeString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  })
  return `<b>🔁 Repeated ${burst.count}× in ${span} (last ${last} BRT)</b>\n`
}

function messageIdOf(response: unknown): number | undefined {
  if (!isRecord(response) || !isRecord(response.result)) return undefined
  const id = response.result.message_id
  return typeof id === "number" ? id : undefined
}

export class TelegramTransport extends TransportStream {
  private botToken: string
  private chatId: string
  private tokens: number
  private maxTokens: number
  private refillRate: number
  private lastRefill: number
  private bursts = new Map<string, Burst>()

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

  private call(method: string, payload: Record<string, unknown>) {
    return fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: this.chatId, parse_mode: "HTML", ...payload }),
    })
  }

  private send(burst: Burst, text: string): Promise<void> {
    return this.call("sendMessage", { text })
      .then((response) => response.json())
      .then((response: unknown) => {
        burst.messageId = messageIdOf(response) ?? burst.messageId
      })
      .catch(() => {})
  }

  // One alert per burst: the repeats are counted into the first message once
  // they pause, or at least every minute while they do not, and sent as a new
  // one when the first never got an id back or can no longer be edited.
  private scheduleEdit(burst: Burst): void {
    const now = Date.now()
    burst.editBy ??= now + MAX_EDIT_WAIT_MS
    clearTimeout(burst.timer)
    burst.timer = setTimeout(
      () => {
        burst.editBy = undefined
        const text = burst.render(repeatLine(burst))
        if (burst.messageId === undefined) {
          void this.send(burst, text)
          return
        }
        this.call("editMessageText", { message_id: burst.messageId, text })
          .then((response) => (response.ok ? response.json() : null))
          .then((response: unknown) => {
            if (isRecord(response) && response.ok === true) return
            burst.messageId = undefined
            return this.send(burst, text)
          })
          .catch(() => {})
      },
      Math.min(EDIT_DELAY_MS, burst.editBy - now),
    )
    burst.timer.unref?.()
  }

  log(
    info: { level: string; message: string; [key: string]: unknown },
    callback: () => void,
  ): void {
    const now = Date.now()
    for (const [key, burst] of this.bursts) {
      if (now - burst.firstAt >= BURST_WINDOW_MS) this.bursts.delete(key)
    }
    const key = burstKey(info)
    const known = this.bursts.get(key)
    if (known) {
      known.count++
      known.lastAt = now
      this.scheduleEdit(known)
      this.emit("logged", info)
      callback()
      return
    }

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
        metadata[key] = withoutFrameworkStack({
          message: value.message,
          stack: value.stack,
        })
      } else {
        metadata[key] = withoutFrameworkStack(value)
      }
    }

    // Telegram rejects the whole message when its HTML does not parse, so the
    // content is cut before the tags go around it: metadata first, down to a
    // floor that still identifies the alert, then the message, and never the
    // anchors. Below that floor the metadata block says nothing and is dropped.
    const preTags = "\n<pre></pre>"
    const serialized =
      Object.keys(metadata).length > 0 ? safeStringify(metadata) : ""
    // A burst's repeat line goes under the header, so the same budget is
    // recomputed around it rather than reserved in every alert.
    const render = (repetition: string) => {
      const available =
        MAX_MESSAGE_LENGTH -
        head.length -
        repetition.length -
        context.length -
        anchors.length
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
      return `${head}${repetition}${message}${context}${anchors}${pre}`
    }
    const burst: Burst = { count: 1, firstAt: now, lastAt: now, render }
    this.bursts.set(key, burst)

    this.send(burst, render("")).finally(() => {
      this.emit("logged", info)
      callback()
    })
  }
}

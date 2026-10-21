import { randomBytes } from "node:crypto"
import { isRouteErrorResponse } from "react-router"
import winston from "winston"
import { ENV } from "varlock/env"
import { MASK, redact } from "./redact.server"
import { TelegramTransport } from "./telegram-transport.server"

const isProduction = ENV.APP_ENV === "production"

const consoleFormat = isProduction
  ? winston.format.combine(winston.format.timestamp(), winston.format.json())
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    )

const transports: winston.transport[] = [
  new winston.transports.Console({ format: consoleFormat }),
]

const {
  TELEGRAM_ALERTS_ENABLED: telegramEnabled,
  TELEGRAM_BOT_TOKEN: botToken,
  TELEGRAM_CHAT_ID: chatId,
} = ENV

if (telegramEnabled && botToken && chatId) {
  transports.push(
    new TelegramTransport({
      botToken,
      chatId,
      level: "error",
    }),
  )
}

// The same ID goes to the Telegram alert and the console line, so the alert
// can be looked up in the Coolify logs with grep.
const stampIncidentId = winston.format((info) => {
  if (info.level === "error" && info.incidentId === undefined) {
    info.incidentId = randomBytes(4).toString("hex")
  }
  return info
})

export const logger = winston.createLogger({
  level: isProduction ? "warn" : "debug",
  format: stampIncidentId(),
  transports,
})

export interface SerializedError {
  name?: string
  message: string
  stack?: string
  cause?: unknown
  [key: string]: unknown
}

const MAX_DEPTH = 3
const MAX_STRING_LENGTH = 1000
const MAX_ARRAY_LENGTH = 20
const MAX_PREVIEW_LENGTH = 200
const SECRET_KEY = /token|secret|password|authorization|cookie|api[-_]?key/i

// A copy that is always safe to JSON.stringify and never huge, because it is
// built on the error path: circular references, deep trees and long strings
// are cut rather than allowed to throw or flood the alert.
function capValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === "string") {
    const redacted = redact(value)
    return redacted.length > MAX_STRING_LENGTH
      ? `${redacted.slice(0, MAX_STRING_LENGTH)}...`
      : redacted
  }
  if (typeof value === "bigint" || typeof value === "symbol") return String(value)
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`
  if (typeof value !== "object" || value === null) return value
  if (seen.has(value)) return "[Circular]"
  if (value instanceof Error) return serializeError(value, seen)
  if (depth >= MAX_DEPTH) return "[Truncated]"
  seen.add(value)
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => capValue(item, depth + 1, seen))
  }
  return copyFields(value, depth + 1, seen)
}

function copyFields(
  value: object,
  depth: number,
  seen: WeakSet<object>,
  skip: string[] = [],
): Record<string, unknown> {
  const copy: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (skip.includes(key)) continue
    copy[key] = SECRET_KEY.test(key) ? MASK : capValue(item, depth, seen)
  }
  return copy
}

function statusMessage(name: string, status: unknown, statusText?: unknown) {
  return [name, status, statusText]
    .filter((part) => part !== undefined && part !== "")
    .join(" ")
}

// winston's production console format is format.json(), and
// JSON.stringify(new Error()) is "{}" — flatten so the message, stack and
// cause reach the container logs, not just the Telegram transport. React
// Router hands handleError whatever was thrown — a Response, a data() value,
// a PostgrestError that is a plain object — so every shape gets a readable
// message, never "[object Object]".
export function serializeError(
  error: unknown,
  seen: WeakSet<object> = new WeakSet(),
): SerializedError {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) }
  }
  if (error instanceof Response) {
    return {
      name: "Response",
      message: statusMessage("Response", error.status, error.statusText),
      status: error.status,
      statusText: error.statusText,
      url: redact(error.url.split("?")[0]),
    }
  }
  if (isRouteErrorResponse(error)) {
    return {
      name: "ErrorResponse",
      message: statusMessage("ErrorResponse", error.status, error.statusText),
      status: error.status,
      statusText: error.statusText,
      data: capValue(error.data, 1, seen),
    }
  }
  if ("type" in error && error.type === "DataWithResponseInit") {
    const init = "init" in error ? error.init : undefined
    const status =
      typeof init === "object" && init !== null && "status" in init
        ? init.status
        : undefined
    return {
      name: "DataWithResponseInit",
      message: statusMessage("DataWithResponseInit", status),
      status,
      data: capValue("data" in error ? error.data : undefined, 1, seen),
    }
  }
  if (seen.has(error)) {
    return {
      message: error instanceof Error ? redact(error.message) : "[Circular]",
    }
  }
  seen.add(error)

  if (error instanceof Error) {
    const extra = copyFields(error, 1, seen, [
      "name",
      "message",
      "stack",
      "cause",
    ])
    return {
      name:
        error.name !== "Error" ? error.name : (error.constructor?.name ?? "Error"),
      message: redact(error.message),
      stack: error.stack === undefined ? undefined : redact(error.stack),
      ...extra,
      ...(error.cause !== undefined && {
        cause:
          error.cause instanceof Error
            ? serializeError(error.cause, seen)
            : capValue(error.cause, 1, seen),
      }),
    }
  }

  const copy = copyFields(error, 1, seen)
  const message =
    "message" in error && typeof error.message === "string"
      ? redact(error.message)
      : JSON.stringify(copy).slice(0, MAX_PREVIEW_LENGTH)
  const constructorName = Object.getPrototypeOf(error)?.constructor?.name
  const isPostgrestError = ["code", "details", "hint"].every((key) => key in error)
  return {
    name:
      constructorName && constructorName !== "Object"
        ? constructorName
        : isPostgrestError
          ? "PostgrestError"
          : "Object",
    ...copy,
    message,
  }
}

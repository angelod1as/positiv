import winston from "winston"
import { ENV } from "varlock/env"
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

export const logger = winston.createLogger({
  level: isProduction ? "warn" : "debug",
  transports,
})

// A raw Error in winston metadata survives the Telegram transport (it unwraps
// Errors) but the production console format is winston.format.json(), and
// JSON.stringify(new Error()) is "{}" — so the stack never reaches the
// container logs. Flatten to a plain object both transports can serialise.
export function serializeError(error: unknown) {
  return error instanceof Error
    ? { message: error.message, stack: error.stack }
    : { message: String(error) }
}

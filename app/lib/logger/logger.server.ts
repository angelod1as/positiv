import winston from "winston"
import { ENV } from "varlock/env"
import { TelegramTransport } from "./telegram-transport.server"

const isProduction = ENV.NODE_ENV === "production"

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

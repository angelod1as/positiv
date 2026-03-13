import winston from "winston"
import { TelegramTransport } from "./telegram-transport.server"

const isProduction = process.env.NODE_ENV === "production"

const consoleFormat = isProduction
  ? winston.format.combine(winston.format.timestamp(), winston.format.json())
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    )

const transports: winston.transport[] = [
  new winston.transports.Console({ format: consoleFormat }),
]

const telegramEnabled = process.env.TELEGRAM_ALERTS_ENABLED === "true"
const botToken = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID

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

import winston from "winston"
import { env } from "~/env.server"
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

const {
  telegramAlertsEnabled: telegramEnabled,
  telegramBotToken: botToken,
  telegramChatId: chatId,
} = env()

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

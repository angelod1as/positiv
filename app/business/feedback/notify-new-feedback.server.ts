import { ENV } from "varlock/env"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"

const MAX_FEEDBACK_LENGTH = 700

const participationLabels: Record<string, string> = {
  never: "Nunca participou",
  once: "Participou uma vez",
  more_than_once: "Participou mais de uma vez",
}

interface NewFeedbackNotification {
  name: string | null
  email: string | null
  whatsapp: string | null
  has_participated: "never" | "once" | "more_than_once"
  feedback_text: string
}

function buildMessage(feedback: NewFeedbackNotification): string {
  const author = feedback.name?.trim() || "Anônimo"
  const contact = [feedback.email, feedback.whatsapp].filter(Boolean).join(" · ")
  const text =
    feedback.feedback_text.length > MAX_FEEDBACK_LENGTH
      ? `${feedback.feedback_text.slice(0, MAX_FEEDBACK_LENGTH)}…`
      : feedback.feedback_text

  const lines = [
    "Novo feedback recebido",
    `De: ${author}${contact ? ` (${contact})` : ""}`,
    participationLabels[feedback.has_participated],
    "",
    text,
    "",
    `${ENV.APP_URL}${paths.admin.ADMIN_FEEDBACKS}`,
  ]

  return lines.join("\n")
}

export async function notifyNewFeedback(
  feedback: NewFeedbackNotification,
): Promise<void> {
  const {
    TELEGRAM_ALERTS_ENABLED: alertsEnabled,
    TELEGRAM_BOT_TOKEN: botToken,
    TELEGRAM_CHAT_ID: chatId,
  } = ENV

  if (!alertsEnabled || !botToken || !chatId) {
    logger.warn(
      "Skipped the new feedback Telegram notification: missing configuration",
      {
        alertsEnabled: !!alertsEnabled,
        hasBotToken: !!botToken,
        hasChatId: !!chatId,
      },
    )
    return
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: buildMessage(feedback),
          disable_web_page_preview: true,
        }),
      },
    )

    if (!response.ok) {
      logger.error("Telegram rejected the new feedback notification", {
        status: response.status,
      })
      return
    }

    logger.info("New feedback notified on Telegram")
  } catch (error) {
    logger.error("Failed to notify a new feedback on Telegram", { error })
  }
}

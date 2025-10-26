import { htmlToText } from "html-to-text"
import type { ViewEvent } from "~types/database/entities.types"
import { reminderMailTemplate } from "./templates/reminder-mail.template"

export const formatReminderMail = async (event: ViewEvent) => {
  const html = reminderMailTemplate(event)
  const text = htmlToText(html)

  return { text, html }
}

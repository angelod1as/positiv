import { render } from "@react-email/components"
import { htmlToText } from "html-to-text"
import type { ViewEvent } from "~types/database/entities.types"
import ReminderEmail from "./templates/emails/reminder-email"

export const formatReminderMail = async (event: ViewEvent) => {
  const html = await render(<ReminderEmail event={event} />)
  const text = htmlToText(html)

  return { text, html }
}

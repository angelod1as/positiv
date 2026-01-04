import { htmlToText } from "html-to-text"
import type { ViewEvent } from "~types/database/entities.types"
import { groupClosingMailTemplate } from "./templates/group-closing-mail.template"

export const formatGroupClosingMail = async (
  event: Omit<ViewEvent, "is_applied">,
) => {
  const html = groupClosingMailTemplate(event)
  const text = htmlToText(html)

  return { text, html }
}

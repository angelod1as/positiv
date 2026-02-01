import { htmlToText } from "html-to-text"
import type { ViewEvent } from "~types/database/entities.types"
import { registrationLimitReachedAdminTemplate } from "./templates/registration-limit-reached-admin.template"

export const formatRegistrationLimitAdminMail = async (
  event: Omit<ViewEvent, "is_applied">,
  participantCount: number,
  timestamp: Date,
) => {
  const html = registrationLimitReachedAdminTemplate(
    event,
    participantCount,
    timestamp,
  )
  const text = htmlToText(html)

  return { text, html }
}

import { htmlToText } from "html-to-text"
import type { Event } from "~types/database/entities.types"
import { registrationLimitReachedAdminTemplate } from "./templates/registration-limit-reached-admin.template"

export const formatRegistrationLimitAdminMail = async (
  event: Event,
  participantCount: number,
  timestamp: Date,
) => {
  const html = registrationLimitReachedAdminTemplate(
    event.id,
    event.title || "",
    event.emoji,
    participantCount,
    timestamp,
  )
  const text = htmlToText(html)

  return { text, html }
}

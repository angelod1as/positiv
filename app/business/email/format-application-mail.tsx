import { htmlToText } from "html-to-text"
import type { Event, ProfileWithRoles } from "~types/database/entities.types"
import { applicationMailTemplate } from "./templates/application-mail.template"

export const formatApplicationMail = async (
  profile: NonNullable<ProfileWithRoles>,
  event: Event,
) => {
  const participantName = profile.social_name || profile.full_name || ""
  const html = applicationMailTemplate(
    participantName,
    event.title || "",
    event.emoji,
    event.location || "",
    event.time_event_start,
  )
  const text = htmlToText(html)

  return { text, html }
}

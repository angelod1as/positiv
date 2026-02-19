import { htmlToText } from "html-to-text"
import type { Event, ProfileWithRoles } from "~types/database/entities.types"
import { applicationMailTemplate } from "./templates/application-mail.template"

export const formatApplicationMail = async (
  profile: NonNullable<ProfileWithRoles>,
  event: Event,
) => {
  const html = applicationMailTemplate(profile, event)
  const text = htmlToText(html)

  return { text, html }
}

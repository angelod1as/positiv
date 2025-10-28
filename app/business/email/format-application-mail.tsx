import { htmlToText } from "html-to-text"
import type { ProfileWithRoles, ViewEvent } from "~types/database/entities.types"
import { applicationMailTemplate } from "./templates/application-mail.template"

export const formatApplicationMail = async (
  profile: NonNullable<ProfileWithRoles>,
  event: ViewEvent,
) => {
  const html = applicationMailTemplate(profile, event)
  const text = htmlToText(html)

  return { text, html }
}

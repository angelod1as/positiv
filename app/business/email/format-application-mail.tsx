import { htmlToText } from "html-to-text"
import { renderTemplate } from "~/business/cms/placeholders"
import type { Event, ProfileWithRoles } from "~types/database/entities.types"
import { type ApplicationCopy, applicationCopyFallback } from "./application-mail-copy"
import { loadApplicationCopy } from "./application-mail-copy.server"
import { APPLICATION_MAIL_VARIABLES } from "./application-mail.variables"
import { renderWithFallback } from "./render-with-fallback"
import { applicationMailTemplate } from "./templates/application-mail.template"

function render(
  profile: NonNullable<ProfileWithRoles>,
  event: Event,
  copy: ApplicationCopy,
) {
  const html = applicationMailTemplate(profile, event, copy)
  const subject = renderTemplate(
    copy.subject,
    { evento: [event.emoji, event.title].filter(Boolean).join(" ") },
    APPLICATION_MAIL_VARIABLES.subject,
  )
  return { html, subject }
}

export const formatApplicationMail = async (
  profile: NonNullable<ProfileWithRoles>,
  event: Event,
) => {
  const copy = await loadApplicationCopy()

  const { html, subject } = renderWithFallback(
    "application",
    (chosen: ApplicationCopy) => render(profile, event, chosen),
    copy,
    applicationCopyFallback,
  )
  const text = htmlToText(html)

  return { text, html, subject }
}

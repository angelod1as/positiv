import { htmlToText } from "html-to-text"
import { renderTemplate } from "~/business/cms/placeholders"
import type { Event } from "~types/database/entities.types"
import {
  type RegistrationLimitAdminCopy,
  registrationLimitAdminCopyFallback,
} from "./registration-limit-admin-mail-copy"
import { loadRegistrationLimitAdminCopy } from "./registration-limit-admin-mail-copy.server"
import { REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES } from "./registration-limit-admin-mail.variables"
import { renderWithFallback } from "./render-with-fallback"
import { registrationLimitReachedAdminTemplate } from "./templates/registration-limit-reached-admin.template"

function render(
  event: Event,
  participantCount: number,
  timestamp: Date,
  copy: RegistrationLimitAdminCopy,
) {
  const html = registrationLimitReachedAdminTemplate(
    event,
    participantCount,
    timestamp,
    copy,
  )
  const subject = renderTemplate(
    copy.subject,
    { evento: [event.emoji, event.title].filter(Boolean).join(" ") },
    REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES.subject,
  )
  return { html, subject }
}

export const formatRegistrationLimitAdminMail = async (
  event: Event,
  participantCount: number,
  timestamp: Date,
) => {
  const copy = await loadRegistrationLimitAdminCopy()

  const { html, subject } = renderWithFallback(
    "registration limit",
    (chosen: RegistrationLimitAdminCopy) =>
      render(event, participantCount, timestamp, chosen),
    copy,
    registrationLimitAdminCopyFallback,
  )
  const text = htmlToText(html)

  return { text, html, subject }
}

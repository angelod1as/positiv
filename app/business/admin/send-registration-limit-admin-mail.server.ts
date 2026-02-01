import { formatRegistrationLimitAdminMail } from "~/business/email/format-registration-limit-admin-mail"
import { type MailOptions, sendEmail } from "~/business/email/send-email"
import { getAdminEmails } from "./get-admin-emails.server"
import type { ViewEvent } from "~types/database/entities.types"

type SendRegistrationLimitAdminMailProps = {
  event: Omit<ViewEvent, "is_applied">
  participantCount: number
  timestamp: Date
}

export const sendRegistrationLimitAdminMail = async ({
  event,
  participantCount,
  timestamp,
}: SendRegistrationLimitAdminMailProps): Promise<{ emailSent: boolean }> => {
  const adminEmails = await getAdminEmails()

  if (adminEmails.length === 0) {
    console.warn("No admin emails found to send registration limit notification")
    return { emailSent: false }
  }

  const { html, text } = await formatRegistrationLimitAdminMail(
    event,
    participantCount,
    timestamp,
  )

  const options: MailOptions = {
    to: adminEmails,
    subject: `📊 Evento atingiu limite de inscrições - ${event.emoji} ${event.title}`,
    text: text,
    html: html,
  }

  const result = await sendEmail(options)

  if (!result.success) {
    console.error("Registration limit admin email failed:", result.errors)
    return { emailSent: false }
  }

  return { emailSent: true }
}

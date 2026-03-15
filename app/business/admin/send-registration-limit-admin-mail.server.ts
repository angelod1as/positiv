import { formatRegistrationLimitAdminMail } from "~/business/email/format-registration-limit-admin-mail"
import { type MailOptions, sendEmail } from "~/business/email/send-email"
import { logger } from "~/lib/logger/logger.server"
import { getAdminEmails } from "./get-admin-emails.server"
import type { Event } from "~types/database/entities.types"

type SendRegistrationLimitAdminMailProps = {
  event: Event
  participantCount: number
  timestamp: Date
  adminEmails?: string[]
}

export const sendRegistrationLimitAdminMail = async ({
  event,
  participantCount,
  timestamp,
  adminEmails: providedAdminEmails,
}: SendRegistrationLimitAdminMailProps): Promise<{ emailSent: boolean }> => {
  const adminEmails = providedAdminEmails ?? (await getAdminEmails())

  if (adminEmails.length === 0) {
    logger.warn("No admin emails found to send registration limit notification")
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
    logger.error("Registration limit admin email failed:", { errors: result.errors })
    return { emailSent: false }
  }

  return { emailSent: true }
}

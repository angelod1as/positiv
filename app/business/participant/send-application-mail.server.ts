import { formatApplicationMail } from "~/business/email/format-application-mail"
import type { Event, ProfileWithRoles } from "~types/database/entities.types"

import { type MailOptions, sendEmail } from "~/business/email/send-email"
import { logger } from "~/lib/logger/logger.server"

type sendApplicationMailProps = {
  event: Event
  profile: NonNullable<ProfileWithRoles>
}
export const sendApplicationMail = async ({
  profile,
  event,
}: sendApplicationMailProps): Promise<{ emailSent: boolean }> => {
  if (!profile.email) return { emailSent: false }

  const { html, text } = await formatApplicationMail(profile, event)

  const options: MailOptions = {
    to: profile.email,
    subject: `Você se inscreveu no evento ${event.emoji} ${event.title}`,
    text: text,
    html: html,
  }

  const result = await sendEmail(options)

  if (!result.success) {
    logger.error("Email sending failed:", result.errors)
    return { emailSent: false }
  }

  return { emailSent: true }
}

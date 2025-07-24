import { formatApplicationMail } from "~/lib/email/format-application-mail"
import type { ProfileWithRoles, ViewEvent } from "~types/database/entities.types"

import { type MailOptions, sendEmail } from "~/lib/email/send-email"

type sendApplicationMailProps = {
  event: ViewEvent
  profile: NonNullable<ProfileWithRoles>
}
export const sendApplicationMail = async ({
  profile,
  event,
}: sendApplicationMailProps) => {
  if (!profile.email) return

  const { html, text } = await formatApplicationMail(profile, event)

  const options: MailOptions = {
    to: profile.email,
    subject: `Você se inscreveu no evento ${event.emoji} ${event.title}`,
    text: text,
    html: html,
  }

  const result = await sendEmail(options)

  if (!result.success) {
    throw new Error("Erro no envio do email de confirmação")
  }

  return true
}

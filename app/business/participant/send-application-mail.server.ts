import { formatCalendarEvent } from "~/business/participant/format-calendar-event.server"
import { formatApplicationMail } from "~/lib/email/format-application-mail"
import type { ProfileWithRoles, ViewEvent } from "~types/entities.types"

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
  const icalEvent = await formatCalendarEvent(event)

  const options: MailOptions = {
    to: profile.email,
    subject: `Você se inscreveu no evento ${event.emoji} ${event.title}`,
    text: text,
    html: html,
    icalEvent: icalEvent?.toString(),
  }

  try {
    await sendEmail(options)
  } catch (error) {
    console.error("MAIL ERROR", error)
  }
}

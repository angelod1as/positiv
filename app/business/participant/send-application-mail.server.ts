import { formatApplicationMail } from "~/lib/email/format-application-mail"
import { formatCalendarEvent } from "~/lib/email/format-calendar-event"
import type { ProfileWithRoles, ViewEvent } from "~types/entities.types"

import { type MailOptions, sendMail } from "~/lib/email/email"

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
    await sendMail(options)
  } catch (error) {
    console.error("MAIL ERROR", error)
  }
}

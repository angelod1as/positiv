import { render } from "@react-email/components"

import { htmlToText } from "html-to-text"
import type { ProfileWithRoles, ViewEvent } from "~types/database/entities.types"
import Email from "~/components/email/templates/application-email"

export const formatApplicationMail = async (
  profile: NonNullable<ProfileWithRoles>,
  event: ViewEvent,
) => {
  const html = await render(<Email profile={profile} event={event} />)
  const text = htmlToText(html)

  return { text, html }
}

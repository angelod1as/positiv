import { cpfExemptionCopy } from "~/copy/account"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"
import paths from "~/lib/paths"

const whatsApp = (text: string) =>
  `https://wa.me/${POSITIV_WHATSAPP}?text=${encodeURIComponent(text)}`

/**
 * Only an admin grants or lifts the CPF exemption, so both links open a chat
 * with the organisation carrying the admin page of the person's profile. Built
 * on the server: the message needs an absolute url, and the browser's own
 * origin is not there to read during the render.
 */
export const cpfExemptionLinks = ({
  origin,
  profileId,
}: {
  origin: string
  profileId: string
}) => {
  const profileUrl = `${origin}${paths.admin.ADMIN_VIEW_PARTICIPANT(profileId)}`

  return {
    request: whatsApp(cpfExemptionCopy.requestMessage(profileUrl)),
    change: whatsApp(cpfExemptionCopy.changeMessage(profileUrl)),
  }
}

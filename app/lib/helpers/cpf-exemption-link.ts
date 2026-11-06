import { cpfExemptionCopy } from "~/copy/account"
import { POSITIV_WHATSAPP } from "~/lib/constants/constants"

const whatsApp = (text: string) =>
  `https://wa.me/${POSITIV_WHATSAPP}?text=${encodeURIComponent(text)}`

/**
 * Only an admin grants or lifts the CPF exemption, so both links open a chat
 * with the organisation. The message carries the profile ID and no link:
 * anyone can edit a pre-written message before sending it, and a link in it is
 * one the admin could be tricked into following. The admin searches the ID on
 * the real site instead.
 */
export const cpfExemptionLinks = ({ profileId }: { profileId: string }) => ({
  request: whatsApp(cpfExemptionCopy.requestMessage(profileId)),
  change: whatsApp(cpfExemptionCopy.changeMessage(profileId)),
})

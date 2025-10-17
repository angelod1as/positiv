import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { profilePropMap } from "./propMaps"

export const mapParticipantsToDownloadFormat = (
  participants: ProfileWithExtraData[],
) => {
  return participants.map(
    ({ full_name, rg, rg_issuer, social_name, approved_to_attend, spot_type }, index) => ({
      "Nº": index + 1,
      "Staff": spot_type === "staff" ? "Staff" : "",
      [profilePropMap("approved_to_attend")]: approved_to_attend,
      [profilePropMap("full_name")]: full_name,
      [profilePropMap("social_name")]: social_name,
      [profilePropMap("rg")]: rg,
      [profilePropMap("rg_issuer")]: rg_issuer,
    }),
  )
}

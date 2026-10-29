import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { adminEventsCopy } from "~/copy/admin/events"
import { formatCpf } from "./cpf"
import { profilePropMap } from "./propMaps"

// The list goes to the motel, so it carries only what the motel asks for. The
// CPF is formatted so Excel keeps it as text instead of dropping leading zeros
export const mapParticipantsToDownloadFormat = (
  participants: ProfileWithExtraData[],
) => {
  return participants.map(({ full_name, social_name, cpf, spot_type }) => ({
    [profilePropMap("full_name")]: full_name,
    [profilePropMap("social_name")]: social_name,
    [profilePropMap("cpf")]: formatCpf(cpf),
    [adminEventsCopy.downloadData.staff]:
      spot_type === "staff" ? adminEventsCopy.downloadData.staff : "",
  }))
}

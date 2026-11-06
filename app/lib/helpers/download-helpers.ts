import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { adminEventsCopy } from "~/copy/admin/events"
import { formatCpf } from "./cpf"
import { profilePropMap } from "./propMaps"

// The list goes to the motel, so it carries only what the motel asks for. The
// CPF is formatted so Excel keeps it as text instead of dropping leading zeros.
// Someone an admin exempted from the CPF has none, and the document they gave
// -- a passport, usually -- is what the door checks instead.
export const mapParticipantsToDownloadFormat = (
  participants: ProfileWithExtraData[],
) => {
  return participants.map(
    ({ full_name, social_name, cpf, cpf_exempt, rg, rg_issuer, spot_type }) => ({
      [profilePropMap("full_name")]: full_name,
      [profilePropMap("social_name")]: social_name,
      [profilePropMap("cpf")]: cpf_exempt
        ? adminEventsCopy.downloadData.foreignDocument(rg, rg_issuer)
        : formatCpf(cpf),
      [adminEventsCopy.downloadData.staff]:
        spot_type === "staff" ? adminEventsCopy.downloadData.staff : "",
    }),
  )
}

import type { ProfileWithRoles } from "~types/database/entities.types"
import { EmailConfirmationModal } from "./email-confirmation-modal"
import { isExemptPath } from "./profile-update-config"
import { ProfileUpdateModal } from "./profile-update-modal"

type ProfileUpdateGuardProps = {
  currentProfile: ProfileWithRoles | null
  currentPath: string
  needsProfileUpdate: boolean
  needsEmailConfirmation?: boolean
  cpfExemptionLink?: string | null
}

export const ProfileUpdateGuard = ({
  currentProfile,
  currentPath,
  needsProfileUpdate,
  needsEmailConfirmation = false,
  cpfExemptionLink = null,
}: ProfileUpdateGuardProps) => {
  if (!currentProfile) {
    return null
  }

  if (isExemptPath(currentPath)) {
    return null
  }

  if (needsProfileUpdate) {
    return <ProfileUpdateModal cpfExemptionLink={cpfExemptionLink} />
  }

  if (needsEmailConfirmation) {
    return <EmailConfirmationModal />
  }

  return null
}
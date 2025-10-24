import type { ProfileWithRoles } from "~types/database/entities.types"
import { isExemptPath } from "./profile-update-config"
import { ProfileUpdateModal } from "./profile-update-modal"

type ProfileUpdateGuardProps = {
  currentProfile: ProfileWithRoles | null
  currentPath: string
  needsProfileUpdate: boolean
}

export const ProfileUpdateGuard = ({
  currentProfile,
  currentPath,
  needsProfileUpdate,
}: ProfileUpdateGuardProps) => {
  if (!currentProfile) {
    return null
  }

  if (isExemptPath(currentPath)) {
    return null
  }

  if (!needsProfileUpdate) {
    return null
  }

  return <ProfileUpdateModal />
}
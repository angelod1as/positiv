import { useProfileUpdateStatus } from "~/lib/hooks/use-profile-update-status"
import type { ProfileWithRoles } from "~types/database/entities.types"
import { isExemptPath } from "./profile-update-config"
import { ProfileUpdateModal } from "./profile-update-modal"

type ProfileUpdateGuardProps = {
  currentProfile: ProfileWithRoles | null
  currentPath: string
}

export const ProfileUpdateGuard = ({
  currentProfile,
  currentPath,
}: ProfileUpdateGuardProps) => {
  const needsProfileUpdate = useProfileUpdateStatus(currentProfile)

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
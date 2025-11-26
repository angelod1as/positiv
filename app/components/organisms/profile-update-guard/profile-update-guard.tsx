import { useProfile } from "~/lib/hooks/use-profile"
import { isExemptPath } from "./profile-update-config"
import { ProfileUpdateModal } from "./profile-update-modal"

type ProfileUpdateGuardProps = {
  currentPath: string
  needsProfileUpdate: boolean
}

export const ProfileUpdateGuard = ({
  currentPath,
  needsProfileUpdate,
}: ProfileUpdateGuardProps) => {
  const { data: currentProfile } = useProfile()

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
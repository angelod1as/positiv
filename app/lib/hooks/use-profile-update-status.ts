import { useMemo } from "react"
import { PROFILE_REQUIREMENTS } from "~/components/organisms/profile-update-guard/profile-update-config"
import type { ProfileWithRoles } from "~types/database/entities.types"

export function useProfileUpdateStatus(
  profile: ProfileWithRoles | null | undefined,
): boolean {
  return useMemo(() => {
    if (!profile) {
      return false
    }

    // Check each required field
    for (const field of PROFILE_REQUIREMENTS.requiredFields) {
      const value = profile[field as keyof ProfileWithRoles]

      // Field is missing if it's null or undefined
      if (value === null || value === undefined) {
        return true
      }

      // Special handling for array fields (like race_color)
      // Check length before the null check above catches it
      if (Array.isArray(value) && (value as unknown[]).length === 0) {
        return true
      }
    }

    return false
  }, [profile])
}

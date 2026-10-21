import { redirectWithError } from "remix-toast"
import { errorsCopy } from "~/copy/errors"
import paths from "~/lib/paths"
import type { contextSchema } from "~/business/common"
import type { z } from "zod"
import { can, type Permission } from "./permissions"

const {
  auth: { LOGIN },
  dash: { DASHBOARD },
} = paths

type CurrentUser = z.infer<typeof contextSchema>["currentUser"]
type CurrentProfile = z.infer<typeof contextSchema>["currentProfile"]

export function requireUser(currentUser: CurrentUser): NonNullable<CurrentUser> {
  if (!currentUser) {
    throw redirectWithError(LOGIN, errorsCopy.auth.loginRequired)
  }
  return currentUser
}

export function requirePermission(
  currentProfile: CurrentProfile,
  permission: Permission,
): NonNullable<CurrentProfile> {
  if (!currentProfile) {
    throw redirectWithError(LOGIN, errorsCopy.auth.loginRequired)
  }

  if (!can(currentProfile, permission)) {
    throw redirectWithError(DASHBOARD, errorsCopy.auth.permissionRequired)
  }

  return currentProfile
}

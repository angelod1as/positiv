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

export async function requireUser(
  currentUser: CurrentUser,
): Promise<NonNullable<CurrentUser>> {
  if (!currentUser) {
    throw await redirectWithError(LOGIN, errorsCopy.auth.loginRequired)
  }
  return currentUser
}

export async function requirePermission(
  currentProfile: CurrentProfile,
  permission: Permission,
): Promise<NonNullable<CurrentProfile>> {
  if (!currentProfile) {
    throw await redirectWithError(LOGIN, errorsCopy.auth.loginRequired)
  }

  if (!can(currentProfile, permission)) {
    throw await redirectWithError(DASHBOARD, errorsCopy.auth.permissionRequired)
  }

  return currentProfile
}

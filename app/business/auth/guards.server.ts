import { redirectWithError } from "remix-toast"
import paths from "~/lib/paths"
import type { contextSchema } from "~/business/common"
import type { z } from "zod"

const {
  auth: { LOGIN },
  dash: { DASHBOARD },
} = paths

type CurrentUser = z.infer<typeof contextSchema>["currentUser"]
type CurrentProfile = z.infer<typeof contextSchema>["currentProfile"]

export function requireUser(currentUser: CurrentUser): NonNullable<CurrentUser> {
  if (!currentUser) {
    throw redirectWithError(
      LOGIN,
      "Você precisa estar logade para continuar",
    )
  }
  return currentUser
}

export function requireAdmin(currentProfile: CurrentProfile): NonNullable<CurrentProfile> {
  if (!currentProfile) {
    throw redirectWithError(
      LOGIN,
      "Você precisa estar logade para continuar",
    )
  }

  if (!currentProfile.is_admin) {
    throw redirectWithError(
      DASHBOARD,
      "Você não tem permissão para acessar esta página",
    )
  }

  return currentProfile
}

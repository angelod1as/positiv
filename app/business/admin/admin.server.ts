import { can, PERMISSIONS } from "~/business/auth/permissions"
import type { Params } from "react-router"
import { redirectWithError } from "remix-toast"
import type { z } from "zod"
import { adminLayoutCopy } from "~/copy/admin"
import paths from "~/lib/paths"


import { getUserContext } from "../auth/auth.server"
import { adminContextSchema } from "./common"

const {
  root: { HOME },
} = paths

export const getAdminContext = async (
  request: Request,
  params: Params,
): Promise<z.infer<typeof adminContextSchema>> => {
  const context = await getUserContext(request, params)

  // Actions call this directly because React Router does not run the admin
  // layout loader, which holds the same check, before a child action
  if (!can(context.currentProfile, PERMISSIONS.ADMIN_PANEL)) {
    throw await redirectWithError(HOME, adminLayoutCopy.accessDenied)
  }

  return context
}

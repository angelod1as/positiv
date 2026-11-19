import type { z } from "zod"
import type { CommitResult } from "~types/forms/commit.types"
import type { currentProfileSchema } from "~/business/auth/auth-schemas"
import { can, PERMISSIONS } from "~/business/auth/permissions"
import { likertScaleCache } from "~/business/cms/likert-scale-cache.server"
import { isLikertEnabled } from "~/business/settings/app-settings.server"
import { likertPageCopy } from "~/copy/account"
import { buildLikertSubmission } from "./build-likert-submission"
import { saveLikertSubmission } from "./likert-submissions.server"

type Viewer = Pick<z.infer<typeof currentProfileSchema>, "id" | "permissions">

// While the switch is off the scale is still being written, so only the admin
// team, who reads the answers, sees it.
export async function canSeeLikert(
  viewer: Viewer | null | undefined,
): Promise<boolean> {
  if (!viewer) return false
  if (can(viewer, PERMISSIONS.ADMIN_PANEL)) return true
  return isLikertEnabled()
}

export async function submitLikertAnswers({
  answers,
  viewer,
}: {
  answers: Record<string, unknown>
  viewer: Viewer | null | undefined
}): Promise<CommitResult> {
  const unavailable: CommitResult = {
    ok: false,
    errors: [],
    message: likertPageCopy.unavailable,
  }

  if (!viewer || !(await canSeeLikert(viewer))) return unavailable

  const scale = await likertScaleCache.get()
  if (!scale) return unavailable

  const submission = buildLikertSubmission(scale, answers)
  if (!submission) {
    return { ok: false, errors: [], message: likertPageCopy.scaleChanged }
  }

  await saveLikertSubmission(viewer, submission)
  return { ok: true }
}

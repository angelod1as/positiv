import type { z } from "zod"
import type { currentProfileSchema } from "~/business/auth/auth-schemas"
import { logger } from "~/lib/logger/logger.server"
import type { LikertSubmission } from "./likert-submissions.server"
import {
  getLikertSubmission,
  listLikertSubmissions,
} from "./likert-submissions.server"

type Viewer = Pick<z.infer<typeof currentProfileSchema>, "id" | "permissions">

export type LikertSubmissionSummary = { id: string; submittedAt: Date }

export interface ParticipantLikertSubmission {
  submission: LikertSubmission
  newerId: string | null
  olderId: string | null
}

export async function getParticipantLikert({
  profileId,
  viewer,
}: {
  profileId: string
  viewer: Viewer | null | undefined
}): Promise<LikertSubmissionSummary[] | null> {
  try {
    const submissions = await listLikertSubmissions(profileId, viewer)
    return submissions
  } catch (error) {
    logger.error("Failed to fetch Likert submissions", { profileId, error })
    return null
  }
}

export async function getParticipantLikertSubmission({
  profileId,
  submissionId,
  viewer,
}: {
  profileId: string
  submissionId: string
  viewer: Viewer | null | undefined
}): Promise<ParticipantLikertSubmission | null> {
  const submissions = await listLikertSubmissions(profileId, viewer)

  // Only an id from this person's own list is opened, so the page of one
  // person never shows another's answers.
  const index = submissions.findIndex(({ id }) => id === submissionId)
  if (index === -1) return null

  const submission = await getLikertSubmission(submissionId, viewer)
  if (!submission) return null

  return {
    submission,
    newerId: submissions[index - 1]?.id ?? null,
    olderId: submissions[index + 1]?.id ?? null,
  }
}
